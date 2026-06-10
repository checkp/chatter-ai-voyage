## Goal

Every billable AI/image call uses ONE pricing formula:

```
real_api_cost_usd × 1.20 (margin)
÷ APP_TOKEN_USD (= $0.001 per token)
→ Math.ceil → app tokens to deduct
```

Every consumption row in `token_transactions` carries `{ platform, model, total_tokens, api_cost_dollars, tokens_charged }` so the Economics page is always accurate.

## Inventory of billable calls today

| Function | Provider call | Today's billing | After fix |
|---|---|---|---|
| `openai-chat` | OpenAI Chat Completions | post-call: `api_cost_per_1k_tokens × providerTokens` then ÷ $0.10 | same formula, but ceil + 20% markup ÷ $0.001 |
| `claude-chat` | Anthropic Messages | same | same |
| `gemini-chat` | Google Gemini | same | same |
| `grok-chat` | xAI Grok | same | same |
| `mistral-chat` | Mistral | same | same |
| `perplexity-chat` | Perplexity | same | same |
| `qwen-chat` | DashScope Qwen | same | same |
| `deepseek-chat` | DeepSeek | same | same |
| `generate-image` | OpenAI / Gemini / Grok image | flat per-model token cost from a hard-coded map | real per-image USD cost table → formula |
| `multi-image-generate` | N image providers in parallel | flat `collab_cost(50) + image_cost` summed; **no platform/model in metadata** | per-sub-call USD cost → formula, one consumption row PER sub-model |
| `generate-chat-title` | OpenAI gpt-4o-mini | not billed today | bill it (tiny) |
| `profile-demo` | Lovable AI Gateway | not billed today | bill it via gateway cost |
| `demo-chat` | OpenAI + Anthropic + DeepSeek | not billed (unauthenticated demo) | leave free, but log call cost for analytics |

Non-billable: `verify-stripe-session`, `create-lemonsqueezy-checkout`, `sync-model-pricing`, webhook handlers.

## Single source of truth

New shared module `supabase/functions/_shared/billing.ts`:

```ts
export const APP_TOKEN_USD = 0.001;     // 1 app token = $0.001
export const MARGIN = 1.20;              // 20% markup
export function usdToTokens(usd: number): number {
  return Math.max(1, Math.ceil((usd * MARGIN) / APP_TOKEN_USD));
}
export function textCostUsd(per1k: number, providerTokens: number): number {
  return (providerTokens / 1000) * per1k;
}
export async function chargeUser(supabase, userId, opts: {
  platform: string; model: string;
  providerTokens: number; apiCostUsd: number;
  description: string; extra?: Record<string, unknown>;
}) {
  const tokens = usdToTokens(opts.apiCostUsd);
  // UPDATE user_tokens, INSERT token_transactions with full metadata
  // returns { tokensCharged, newBalance }
}
```

Every chat/image function imports this and calls `chargeUser(...)` instead of inlining its own math.

## DB additions

New table `public.image_model_pricing(platform, model_id, usd_per_image, size_modifier_json)` to mirror `model_pricing` for image models that don't bill per token. Same GRANT + RLS pattern as `model_pricing` (read-only to authenticated, full to service_role).

Seed rows:
- `openai / dall-e-3`: $0.040 (1024² standard), $0.080 (1792 / hd)
- `openai / gpt-image-1`: $0.040
- `google / gemini-2.5-flash-image`: $0.020
- `xai / grok-aurora`: $0.030
- `pollinations / *`: $0.000 (free)

`sync-model-pricing` already updates text pricing; extend it to refresh this table from a curated list.

## Per-function changes

1. **All 8 chat functions** — replace the manual UPDATE + token math with:
   ```ts
   const cost = textCostUsd(pricing.api_cost_per_1k_tokens, usage.total_tokens);
   await chargeUser(supabase, user.id, { platform, model, providerTokens: usage.total_tokens, apiCostUsd: cost, description: `${platform}:${model}` });
   ```
   Pre-call balance check stays (using `tokens_per_message` as floor).

2. **generate-image** — look up `image_model_pricing` by `{platform, model, size}`, compute USD cost, `chargeUser(...)`. Roll back image on deduction failure (already in place).

3. **multi-image-generate** — for each sub-model that succeeds, write its own consumption row via `chargeUser` with the sub-model's USD cost. Drop the magic `collab_cost: 50`; conductor overhead becomes a single `platform: 'multi-image', model: 'orchestrator', apiCostUsd: 0.01` row instead of an invisible 50-token surcharge.

4. **generate-chat-title** — `chargeUser` against `openai / gpt-4o-mini` provider tokens.

5. **profile-demo** — `chargeUser` against `google / gemini-2.5-flash` (the gateway model used).

6. **demo-chat** — unchanged billing (free), but write a `transaction_type: 'demo_consumption'` row with cost so we can see subsidy.

## Frontend impact

`useEconomicsData.ts`:
- Use `metadata.api_cost_dollars` exclusively (no $0.10 fallback, since every new row has it).
- Use `metadata.tokens_charged` for app-token totals instead of `Math.abs(amount)` (they'll match, but it's clearer).
- "Unknown" platform bucket disappears.
- Show effective margin: `(tokens_charged × APP_TOKEN_USD) − api_cost_dollars`, which equals 16.6% of revenue by construction (the 20% markup minus rounding).

Backfill: old rows without `api_cost_dollars` keep the existing fallback path so historical numbers don't break — labeled "(legacy)" in the table.

## Out of scope

- Per-user spend dashboard.
- Dynamic markup per model (one global 20%).
- Refund flow for failed multi-image sub-calls (the failing sub-call simply isn't charged).

## Files touched

- new: `supabase/functions/_shared/billing.ts`
- new: migration creating `image_model_pricing` + GRANT + RLS + seed
- edit: 8 chat edge functions
- edit: `generate-image`, `multi-image-generate`, `generate-chat-title`, `profile-demo`, `demo-chat`, `sync-model-pricing`
- edit: `src/hooks/useEconomicsData.ts`, `src/components/admin/AdminEconomics.tsx` (drop fallback, add margin column)
