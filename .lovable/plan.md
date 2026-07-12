# RoboHeard MCP Server for Coding Agents

Ship an MCP server built into this app so Claude Code, Cursor, Codex, etc. can call your Conductor, individual models, and web search — signed in as **you**, spending your tokens, and writing chats into your history.

## Auth: Supabase OAuth 2.1 (protected)

- Enable Supabase OAuth 2.1 + Dynamic Client Registration on the project.
- Add a `/oauth/consent` page that uses the existing browser Supabase client to approve/deny incoming MCP client authorizations. Route login redirects (password, signup, Google) back to the consent URL so "Add to Cursor / Claude" completes cleanly.
- The MCP server validates Supabase JWTs on every tool call and forwards the caller's bearer to your existing chat edge functions, so RLS and per-user token deduction run as that user (no service-role bypass).

## Stack

Uses `@lovable.dev/mcp-js` with the Supabase Vite plugin. The plugin bundles `src/lib/mcp/` into a single Deno edge function at `supabase/functions/mcp/index.ts` — never hand-edited. Deployed endpoint: `https://vczxurigjttwxwilosjz.supabase.co/functions/v1/mcp`.

## Tools

Each tool description is written for coding agents to pick the right one.

1. **`list_models`** *(read-only)* — Returns the caller's enabled platforms/models (`openai`, `anthropic`, `google`, `grok`, `deepseek`, `perplexity`, `mistral`, `qwen`) with which capabilities each supports (think / search / deep_research / code_exec). Reads `user_platform_settings` for the user.

2. **`ask_model`** *(read-only from MCP's POV; consumes tokens)* — Input: `platform`, optional `model`, `prompt`, optional `capabilities` (`think`, `search`, `deep_research`, `code_exec`), optional `conversation_id` to continue a chat. Invokes the matching `{platform}-chat` edge function with the user's JWT. Returns `{ content, conversation_id, tokens_used }`. Creates a new conversation row if `conversation_id` is omitted, so it lands in the user's chat list.

3. **`web_search`** *(read-only)* — Thin wrapper on `perplexity-chat` with `capabilities.search=true` and `sonar-pro` model. Input: `query`, optional `recency` ("day"|"week"|"month"). Returns `{ answer, citations[] }`. Does not persist a chat by default.

4. **`ask_conductor`** *(mutates: writes to chat history)* — Input: `prompt`, optional `conductor_platform` (default from profile), optional `conversation_id`, optional `include_platforms[]` to restrict which agents fan out. Runs the full `processConductorMessageFlow` server-side (ported into a shared helper so both the browser hook and the MCP tool call it). Persists user message, conductor decision, agent fan-out, and synthesis just like the UI does. Returns `{ conversation_id, conductor_summary, agent_responses: [{platform, content}], routing }`.

5. **`iterate`** *(mutates)* — Input: `prompt`, `iterations` (2–5, clamped), optional `conductor_platform`, optional `include_platforms[]`. Loop:
   - Iter 1: run `ask_conductor` on the prompt.
   - Iters 2..N-1: feed the previous iteration's synthesized answer + agent responses back as "critique and improve" input to the conductor.
   - Final iter: conductor produces a concluding synthesis explicitly marked as final.
   All iterations write into a single new conversation so you can review the reasoning in the RoboHeard UI. Returns `{ conversation_id, iterations: [{summary, agents}], final }`.
   Annotated as long-running-ish; keeps default max at 3 to stay under MCP client timeouts.

## New/edited files

New:
- `src/lib/mcp/index.ts` — `defineMcp` entry with Supabase OAuth issuer built from `VITE_SUPABASE_PROJECT_ID`, all 5 tools registered.
- `src/lib/mcp/tools/list-models.ts`
- `src/lib/mcp/tools/ask-model.ts`
- `src/lib/mcp/tools/web-search.ts`
- `src/lib/mcp/tools/ask-conductor.ts`
- `src/lib/mcp/tools/iterate.ts`
- `src/lib/mcp/shared/supabase.ts` — helper that builds a per-request Supabase client with the caller's forwarded bearer token.
- `src/lib/mcp/shared/conductorRun.ts` — server-side port of `processConductorMessageFlow` that calls each `{platform}-chat` edge function directly (no browser deps).
- `src/pages/OAuthConsent.tsx` routed at `/.lovable/oauth/consent` (approve/deny UI reading `supabase.auth.oauth`).

Edited:
- `vite.config.ts` — add `mcpPlugin()` from `@lovable.dev/mcp-js/stacks/supabase/vite`.
- `src/App.tsx` — add the `/.lovable/oauth/consent` route.
- `src/pages/AuthPage.tsx` (and Google OAuth path) — preserve and honor a `next` query param so consent flow returns to the consent URL.
- `index.html` — no change unless favicon missing (it exists).
- `package.json` — add `@lovable.dev/mcp-js`, `zod`.

## Backend changes

- Activate Supabase OAuth 2.1 authorization server (adds `/oauth/*` endpoints + DCR).
- Deploy `mcp` edge function via the Vite plugin's generated bundle.
- No schema changes required — reuses `conversations`, `messages`, `user_tokens`, `profiles`, `user_platform_settings`.

## Technical details

- **Token accounting**: Because tools call the existing `{platform}-chat` edge functions with the user's JWT, `_shared/billing.ts` runs unchanged and deducts from `user_tokens` normally. No parallel billing path.
- **Rate/timeout**: `iterate` capped at 5, default 3. Each conductor round runs agents in parallel (existing `Promise.allSettled` behavior).
- **Capabilities**: `ask_model` and `ask_conductor` accept the same capability flags used in the UI so agents can request live search or deep reasoning explicitly.
- **Errors**: Tool handlers return `{ content: [{ type: 'text', text }], isError: true }` with the underlying error string (rate limit, credits, provider error) so the coding agent sees actionable failures.
- **Manifest**: After tools/entry are written, run `app_mcp_server--extract_mcp_manifest`, then deploy the `mcp` function.

## What each tool looks like to your coding agent

```text
list_models      → pick a target
ask_model        → single-model quick answer
web_search       → cited fresh facts
ask_conductor    → multi-model synthesis, saved to chat
iterate          → N-round refinement, saved to chat
```

## Out of scope

- Streaming responses inside a single MCP tool call (returns final text only).
- Image generation tools (can be added later once base is working).
- Exposing per-user MCP admin UI beyond the standard consent screen.
