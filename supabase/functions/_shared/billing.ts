// Single source of truth for converting provider USD cost into app tokens.
//
// Formula:
//   tokens = ceil((api_cost_usd * MARGIN) / APP_TOKEN_USD)
//
// All chat/image edge functions must use chargeUser() so every consumption
// row carries { platform, model, total_tokens, api_cost_dollars, tokens_charged }
// and the Economics dashboard never has to guess.

export const APP_TOKEN_USD = 0.001; // 1 app token = $0.001 (1/10 of a cent)
export const MARGIN = 1.20;          // 20% markup over real API cost

export function usdToTokens(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 1;
  return Math.max(1, Math.ceil((usd * MARGIN) / APP_TOKEN_USD));
}

export function textCostUsd(per1kUsd: number, providerTokens: number): number {
  if (!Number.isFinite(per1kUsd) || per1kUsd <= 0) return 0;
  if (!Number.isFinite(providerTokens) || providerTokens <= 0) return 0;
  return (providerTokens / 1000) * per1kUsd;
}

export interface ChargeOpts {
  platform: string;
  model: string;
  providerTokens?: number;        // provider-side token count (text models)
  apiCostUsd: number;             // real USD cost we pay the provider
  description?: string;
  extra?: Record<string, unknown>;
}

export interface ChargeResult {
  tokensCharged: number;
  newBalance: number;
}

/**
 * Deducts tokens from the user, writes a consumption transaction with full
 * pricing metadata, and returns the new balance.
 *
 * Throws if the user has no token row or the deduction fails — callers should
 * roll back any side effects (e.g. uploaded image) and surface a 500.
 */
export async function chargeUser(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  opts: ChargeOpts,
): Promise<ChargeResult> {
  const tokensCharged = usdToTokens(opts.apiCostUsd);

  const { data: tokenRow, error: readErr } = await supabase
    .from("user_tokens")
    .select("balance, total_consumed")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) throw new Error(`token read failed: ${readErr.message}`);
  if (!tokenRow) throw new Error("user has no token balance row");

  const newBalance = Math.max(0, (tokenRow.balance ?? 0) - tokensCharged);
  const newConsumed = (tokenRow.total_consumed ?? 0) + tokensCharged;

  const { error: updErr } = await supabase
    .from("user_tokens")
    .update({
      balance: newBalance,
      total_consumed: newConsumed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updErr) throw new Error(`token update failed: ${updErr.message}`);

  const { error: txErr } = await supabase.from("token_transactions").insert({
    user_id: userId,
    transaction_type: "consumption",
    amount: -tokensCharged,
    balance_after: newBalance,
    description: opts.description ?? `${opts.platform}:${opts.model}`,
    metadata: {
      platform: opts.platform,
      model: opts.model,
      total_tokens: opts.providerTokens ?? 0,
      api_cost_dollars: Number(opts.apiCostUsd.toFixed(6)),
      tokens_charged: tokensCharged,
      app_token_usd: APP_TOKEN_USD,
      margin: MARGIN,
      ...(opts.extra ?? {}),
    },
  });

  if (txErr) {
    // Tx log failure is non-fatal for the user but should be visible in logs.
    console.error("[billing] transaction log failed:", txErr.message);
  }

  return { tokensCharged, newBalance };
}

/**
 * Pre-call balance check. Uses model_pricing.tokens_per_message as a
 * conservative floor so zero-balance users don't trigger paid API calls.
 * Returns the floor used; caller must compare with current balance and 402.
 */
export function preflightFloor(tokensPerMessage: number | null | undefined): number {
  return Math.max(1, Number(tokensPerMessage) || 1);
}
