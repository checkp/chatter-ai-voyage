---
name: Interactive Demo
description: Landing page demo chat — anonymous Supabase auth, per-user Postgres rate limits, global daily cap, round-robin one model per turn
type: feature
---
Landing-page DemoChat (src/components/index/DemoChat.tsx) calls the `demo-chat` edge function.

Security model:
- Client signs in anonymously via `supabase.auth.signInAnonymously()` on mount and before each send.
- Edge function REQUIRES Authorization Bearer JWT (verified via `supabase.auth.getClaims`). Anonymous JWTs are accepted.
- Rate limits are stored in Postgres tables (`demo_rate_limits`, `demo_daily_usage`) — NOT in-memory and NOT keyed by `x-forwarded-for` (which is spoofable).

Limits (tune in supabase/functions/demo-chat/index.ts):
- Per user: HOUR_LIMIT=5, DAY_LIMIT=20
- Global daily cap: GLOBAL_DAILY_LIMIT=2000 demo calls/day across all users
- MAX_TOKENS=140 per response

Cost optimization: ONE model per turn (round-robin via `turnIndex` from client), not all 3 in parallel. Cuts API spend ~3×.

After 2 sends the conversation is persisted to localStorage as `demo_conversation` and a signup CTA overlay is shown.

REQUIRES: Anonymous sign-ins must be enabled in Supabase Auth → Providers.
