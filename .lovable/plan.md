# Shared Context: Hybrid Memory + RAG

Give agents knowledge of all the user's chats via two layers: a persistent **memory document** (stable facts, preferences) and **semantic retrieval** (relevant snippets from any past conversation). On by default, opt-out per chat.

## How it will work

1. Every saved message gets embedded (vector) in the background.
2. When the user sends a message, the app fetches a "shared context" block: the user's memory doc + the top ~6 most relevant snippets from all their past chats.
3. That block is injected into the system prompt for every agent in that turn.
4. After conversation activity, an AI pass distills new stable facts into the memory document.
5. A toggle in chat settings ("Shared context" — default ON) lets the user opt a chat out, both from contributing to and reading from shared context.

## Database (migration)

- Enable `pgvector` extension.
- `user_memory` table: one row per user with a markdown memory doc + `updated_at`. Owner-scoped RLS, grants for authenticated + service_role.
- `message_embeddings` table: `user_id`, `conversation_id`, `message_id`, `content`, `embedding vector(1536)`, HNSW index. Owner-scoped RLS + grants.
- `match_user_context(user_id, query_embedding, match_count)` SQL function for similarity search, excluding the current conversation.
- `shared_context_enabled boolean default true` column on `conversations`.

## Edge functions

- **`embed-messages`** — embeds new messages via Lovable AI embeddings (`openai/text-embedding-3-small`, 1536 dims — cheap, high volume). Also handles a one-time backfill of existing messages in batches.
- **`shared-context`** — embeds the user's incoming message, runs similarity search, fetches the memory doc, returns a compact context block. JWT-derived user_id, never from body (per project security rules).
- **`update-memory`** — distills recent conversation content into the memory document using Gemini Flash; triggered after a conductor/discussion round completes (debounced, not per message).

## Frontend

- `buildConversationForPlatform` (usePlatforms.ts): fetch the shared-context block before AI calls and include it in the prompt — skipped when the chat's toggle is off.
- Toggle in chat header settings, auto-saved (no save button, per project conventions), default ON.
- Retry/backoff on the new edge function calls, matching the existing 3-retry AI resilience rule.

## Context-quality fixes (bundled)

1. **Proper system role** — the big context prompt is currently sent as a fake `user` message; switch to a real `system` message (OpenAI-style) / `system` param (Claude). Improves instruction-following for all 7 providers.
2. **Claude output cap** — raise `max_tokens` from 1,000 to 4,096 to match OpenAI.
3. **History window** — raise the hard 15-message slice to 30; older context is now covered by RAG instead of being silently dropped.

## Costs & notes

- Embeddings are very cheap (fractions of a cent per message) and run server-side off the user's token balance — no change to user-facing billing.
- The shared-context block is capped (~800 tokens) so it doesn't blow up per-call costs.
- Backfill of existing messages runs once, in batches, after deploy.