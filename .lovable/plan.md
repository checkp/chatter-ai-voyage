## Problem

Token credit currently depends entirely on the user landing on `/success` and the `verify-lemonsqueezy-order` function finding a `paid` order via the LS API. If the order is still finalizing, the user closes the tab, or the redirect is flaky, tokens never get credited and the page shows "Payment Error" / non-2xx.

There is no Lemon Squeezy webhook ("callback") configured, so the backend has no guaranteed signal that the payment completed.

## Fix

Add a server-to-server webhook from Lemon Squeezy as the source of truth, and keep the success page as a best-effort confirmation UI.

### 1. New edge function: `lemonsqueezy-webhook` (public, no JWT)

- Reads raw body + `X-Signature` header.
- Verifies HMAC-SHA256 against new secret `LEMONSQUEEZY_WEBHOOK_SECRET`.
- Handles `order_created` (and `order_refunded` later if needed) where `attributes.status === "paid"`.
- Extracts `user_id` and `package_id` from `meta.custom_data` (LS forwards the `checkout_data.custom` we already send).
- Looks up the package, computes tokens (`tokens + bonus`), and credits via service role:
  - Idempotency: skip if a `token_transactions` row already exists with `metadata.ls_order_id = <order id>`.
  - Update `user_tokens.balance` + `total_purchased`.
  - Insert `token_transactions` row with `metadata.ls_order_id`, `package_id`, `payment_method: 'lemonsqueezy'`.
- Always returns 200 after signature check passes so LS doesn't retry-spam on app errors (logs the failure).

### 2. `supabase/config.toml`

Add the new function with `verify_jwt = false` so LS can call it unauthenticated.

### 3. Update `verify-lemonsqueezy-order`

- Keep the existing LS-API lookup as a fast path.
- If no order is found yet, also check `token_transactions` for any recent `purchase` row matching `(user_id, package_id)` from `metadata` — that means the webhook already credited it; return `success: true, alreadyProcessed: true`.
- Continue returning `{ pending: true }` (200) when neither path finds anything, so Success.tsx keeps polling.

### 4. `src/pages/Success.tsx`

Minor: extend the polling cap (currently 8 retries × 2.5s ≈ 20s) to ~60s so the webhook has time to land if the LS API search is slow. No structural changes.

### 5. Secret + dashboard setup (user action)

- Add `LEMONSQUEEZY_WEBHOOK_SECRET` via the secrets tool.
- Tell the user to create a webhook in the Lemon Squeezy dashboard:
  - URL: `https://vczxurigjttwxwilosjz.supabase.co/functions/v1/lemonsqueezy-webhook`
  - Signing secret: same value as `LEMONSQUEEZY_WEBHOOK_SECRET`
  - Events: `order_created` (and optionally `order_refunded`).

## Result

Even if the redirect to `/success` fails or the LS orders list lags, the webhook credits tokens within seconds of payment. The success page either confirms via the LS API or via the webhook-written transaction row.
