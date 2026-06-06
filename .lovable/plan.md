## Wire up Lemon Squeezy variant IDs

Update the four `token_packages` rows with the variant IDs you provided so the "Pay with Lemon Squeezy" button activates immediately.

| Package | Price | Variant ID |
|---|---|---|
| Starter Pack | $1 | 1754287 |
| Popular Pack | $5 | 1754293 |
| Pro Pack | $10 | 1754304 |
| Mega Pack | $20 | 1754312 |

### Changes
1. Run an UPDATE on `token_packages` setting `lemonsqueezy_variant_id` for each of the 4 rows (matched by id).
2. No code or schema changes — column and edge functions already exist.

### Verification
- Reload the purchase page; each card's "Pay with Lemon Squeezy" button should be enabled.
- Click one to confirm it redirects to a Lemon Squeezy hosted checkout.

After approval I'll also remind you to test a $1 purchase end-to-end (checkout → /success → tokens credited).
