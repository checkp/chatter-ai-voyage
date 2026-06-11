// Single source of truth for converting provider USD cost into app tokens
// and atomically deducting tokens to prevent TOCTOU race conditions.
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
  providerTokens?: number;
  apiCostUsd: number;
  description?: string;
  extra?: Record<string, unknown>;
}

export interface ChargeResult {
  tokensCharged: number;
  newBalance: number;
}

export class InsufficientTokensError extends Error {
  constructor(public tokensRequired: number) {
    super("Insufficient tokens");
    this.name = "InsufficientTokensError";
  }
}

/**
 * Atomically deducts tokens via the `deduct_user_tokens` RPC, which performs a
 * single `UPDATE ... WHERE balance >= p_tokens RETURNING balance` so that two
 * concurrent requests cannot both pass the check and skip a deduction.
 *
 * Throws `InsufficientTokensError` if the user lacks balance (caller should
 * return HTTP 402). Throws a generic Error on DB failure.
 */
export async function chargeUser(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  opts: ChargeOpts,
): Promise<ChargeResult> {
  const tokensCharged = usdToTokens(opts.apiCostUsd);

  const { data, error } = await supabase.rpc("deduct_user_tokens", {
    p_user_id: userId,
    p_tokens: tokensCharged,
  });

  if (error) throw new Error(`token deduction failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new InsufficientTokensError(tokensCharged);

  const newBalance = row.new_balance ?? row.newBalance ?? 0;

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
    console.error("[billing] transaction log failed:", txErr.message);
  }

  return { tokensCharged, newBalance };
}

/**
 * Pre-call balance check. Uses model_pricing.tokens_per_message as a
 * conservative floor so zero-balance users don't trigger paid API calls.
 */
export function preflightFloor(tokensPerMessage: number | null | undefined): number {
  return Math.max(1, Number(tokensPerMessage) || 1);
}
