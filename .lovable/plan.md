## Context

Your project is connected to an external Supabase, so Lovable's built-in Paddle/Stripe Payments cannot be used — those require Lovable Cloud. The good news: you already have a working **bring-your-own-key Stripe** integration in this codebase (`create-token-checkout` edge function, `STRIPE_SECRET_KEY` secret, Success page handler). Stripe fully supports Israeli sellers (Stripe Israel launched for ILS-based businesses) and Israeli card buyers, so it's the natural replacement for PayPal.

## Recommendation

Keep Stripe. Remove PayPal. No new provider needed.

Why not the alternatives:
- **Paddle / Lovable Payments** — blocked because the project uses external Supabase, not Lovable Cloud.
- **Local Israeli processors** (Tranzila, Cardcom, Meshulam, PayPlus, iCount) — would require a brand-new integration, custom webhook handling, and a separate merchant account. Only worth it if you specifically need Bit, local invoicing/receipts (חשבונית מס), or shekel-native checkout. Say the word and I'll plan one of these instead.
- **Polar / LemonSqueezy (Merchant of Record)** — viable for digital token sales and handles VAT globally, but adds a new vendor when Stripe already works.

## Plan

1. **Remove PayPal from the UI**
   - Delete `src/components/PayPalPurchaseButton.tsx`.
   - Remove the PayPal button + related logic from `src/components/TokenPurchase.tsx`, leaving only the Stripe "Buy with Card" flow.
   - Strip PayPal branches from `src/pages/Success.tsx` (keep Stripe `session_id` handling).
   - Remove PayPal references from `src/components/admin/AdminApiKeys.tsx`.

2. **Remove PayPal edge functions**
   - Delete `supabase/functions/create-paypal-order/` and `supabase/functions/capture-paypal-payment/`.
   - Leave `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` secrets in place (you can remove them in Supabase dashboard later — they're harmless until then).

3. **Verify Stripe checkout still works end-to-end**
   - Confirm `create-token-checkout` returns a Stripe Checkout URL.
   - Confirm `Success.tsx` credits tokens after a successful Stripe session.
   - Add ILS as a supported currency option if you want shekel pricing (currently likely USD).

4. **Optional polish**
   - Add Apple Pay / Google Pay automatically (Stripe enables these for any card session — no code change, just toggle in Stripe dashboard).
   - Add a short note on the purchase page: "Payments processed securely by Stripe."

## Questions before I build

- Do you want prices to stay in **USD**, or switch token packages to **ILS**?
- Should I leave the PayPal secrets in Supabase for now, or do you want a reminder to delete them after?
- Anything Israel-specific you need that Stripe doesn't cover (Bit, חשבונית מס auto-generation, installments/תשלומים)? If yes, we'd need to add a local processor on top — I'll plan that separately.
