
# Admin Economics page: revenue vs real API cost

A new admin tab that turns the data already in `token_transactions` and `token_packages` into a clear P&L view, so you can see whether your token pricing covers (and how much it beats) the real provider API bill.

## Where it lives

New tab **"Economics"** in `AdminPanel.tsx`, alongside Users / Overview / Model Pricing / Packages / API Keys / Settings.

New components:
- `src/components/admin/AdminEconomics.tsx` — page container, date-range toggle, summary cards, tables.
- `src/components/admin/economics/EconomicsSummary.tsx` — KPI cards.
- `src/components/admin/economics/PlatformBreakdown.tsx` — per-platform table.
- `src/components/admin/economics/ModelBreakdown.tsx` — per-model table.
- `src/components/admin/economics/PackageBreakdown.tsx` — per-package revenue & implied $/token.
- `src/hooks/useEconomicsData.ts` — single React Query hook that pulls transactions + packages and computes everything client-side (admin-only, fine for the volumes here).

## What it shows

### 1. Top KPI cards
- **Revenue** — `sum(price_cents)` from `transaction_type='purchase'` (converted to USD).
- **Tokens sold** — `sum(amount)` from `purchase`.
- **Effective sell price / token** — Revenue ÷ Tokens sold (USD).
- **Tokens consumed** — `sum(|amount|)` from `transaction_type='consumption'`.
- **Real API cost** — `sum(metadata.api_cost_dollars)` from `consumption` (USD).
- **Realized cost / token** — Real API cost ÷ Tokens consumed (should hover near the configured $0.10/token rate).
- **Gross margin (consumed)** — `(tokens_consumed × sell_price_per_token) − api_cost`. Shown as USD and as %.
- **Free-tier subsidy** — `sum(amount)` from `transaction_type='daily_bonus'` × realized cost/token. The cost of free tokens we hand out — only "real" when actually spent, so we also show a *spent-portion* estimate.
- **Outstanding liability** — `sum(balance)` across all `user_tokens` × realized cost/token, i.e. how much API cost we owe if every user spent their balance right now.

### 2. Per-platform breakdown (table)
For each `metadata.platform` in consumption rows:
- Calls (count), Provider tokens, App tokens consumed, Real USD cost, Implied revenue (app tokens × sell price), Margin USD, Margin %.

### 3. Per-model breakdown (table)
Group by `metadata.platform` + `metadata.model`:
- Calls, Avg provider tokens / call, Avg app tokens deducted / call, $ cost / call, configured `api_cost_per_1k_tokens` from `model_pricing` (drift check), Margin %.
- Highlight rows where realized cost > 80% of implied revenue (red).

### 4. Per-package breakdown (table)
Join `purchase` transactions with `token_packages` via `metadata.package_id` (fall back to matching `amount` and `price_cents`):
- Package name, units sold, total tokens granted (incl. bonus), revenue USD, $/token after bonus, implied API-cost coverage ratio.

### 5. Time filter
Top-right segmented control: **7d / 30d / 90d / All**. All queries re-filter by `created_at`. Default 30d.

## Data plumbing

All admin-only. Add nothing new to the DB — just read what's there.

Queries inside `useEconomicsData`:
1. `token_transactions` where `created_at >= since` paged at 1000-row chunks until exhausted (admin can have lots of rows; loop with `range()`).
2. `token_packages` (all rows incl. inactive — historic purchases may reference inactive packages).
3. `model_pricing` (for drift comparison).
4. `user_tokens` aggregate balance — fetch with a select and reduce client-side.

Cache: `staleTime: 60_000`, `refetchOnWindowFocus: false`. Heavy aggregation lives in `useMemo`.

## Assumptions / edge cases handled

- Old consumption rows that predate `api_cost_dollars` in metadata: fall back to `model_pricing.api_cost_per_1k_tokens × (total_tokens/1000)`; if that's missing too, fall back to `app_tokens × $0.10`. Flag those rows in a small "estimated" badge in tooltips.
- Refunds / admin grants (`transaction_type` not in {purchase, consumption, daily_bonus}) are bucketed into an "Other" line so totals reconcile.
- Image generation rows (platform=`image`, model in {dall-e-3, gemini-image, …}) are included in per-model breakdown so the page covers chat *and* image revenue.
- Currency: everything is rendered in USD; no FX needed since `model_pricing` and Stripe/LS amounts are already USD.

## Out of scope (can follow up)

- Per-user economics (LTV, top spenders) — easy to add but bloats this page.
- CSV export.
- Materialized view / nightly rollup — only needed if `token_transactions` gets very large.

## Technical notes

- React Query + `useMemo` for derived numbers.
- All UI uses existing shadcn `Card` / `Table` / `Tabs` / `ToggleGroup` primitives — no new deps.
- Number formatting via `Intl.NumberFormat` (USD + compact for token counts).
- Admin check piggy-backs on the existing `userProfile.is_admin` gate in `AdminPanel.tsx`; the new tab is hidden / disabled for non-admins (same as the others).
