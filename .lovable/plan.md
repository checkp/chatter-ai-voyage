# Advanced AI Capabilities — Think / Search / Research / Code

Add four cross-provider capabilities exposed as (a) per-message toggles in the chat composer, (b) per-agent defaults in Agent Settings, and (c) conductor-driven auto-assignment per sub-task.

## Capabilities & provider mapping

| Capability | OpenAI | Claude | Gemini | Grok | DeepSeek | Mistral | Perplexity | Qwen |
|---|---|---|---|---|---|---|---|---|
| **Think** (extended reasoning) | `reasoning.effort: "high"` on gpt-5 / o-series | `thinking: { type: "enabled", budget_tokens: 8000 }` on Sonnet/Opus 4 | `thinking_config.thinking_budget` on 2.5 models | `reasoning_effort: "high"` on grok-4 | switch to `deepseek-reasoner` | — (no-op badge) | switch to `sonar-reasoning-pro` | — |
| **Search** (live web) | `tools: [{type:"web_search"}]` (Responses-style) | `tools: [{type:"web_search_20250305"}]` | `tools: [{google_search:{}}]` on 2.5 | `search_parameters: {mode:"on"}` (Live Search) | — | — | always-on; switch to `sonar-pro` | — |
| **Deep Research** | switch to `gpt-5` with reasoning high + web_search | `claude-opus-4` + thinking + web_search | `gemini-2.5-pro` + thinking + search | `grok-4-heavy` + reasoning + search | `deepseek-reasoner` | — | `sonar-deep-research` | `qwen-max` |
| **Code Execution** | `tools: [{type:"code_interpreter"}]` | `tools: [{type:"code_execution_20250522"}]` | `tools: [{code_execution:{}}]` | — | — | — | — | — |

Unsupported combos show a muted "not supported on this model" hint in tooltip; toggle is greyed out, not removed.

## Data model

New table `user_capability_defaults` (per user, per platform) for agent-level defaults:
```
user_id uuid, platform text, think bool, search bool, deep_research bool, code_exec bool,
primary key (user_id, platform)
```
With standard `GRANT`s + RLS scoped to `auth.uid()`.

Conductor messages already persist routing JSON; extend the route schema to include `capabilities: { think?, search?, deep_research?, code_exec? }` per assigned agent.

## Backend (edge functions)

Each chat function (`openai-chat`, `claude-chat`, `gemini-chat`, `grok-chat`, `deepseek-chat`, `perplexity-chat`, `mistral-chat`, `qwen-chat`) accepts an optional `capabilities` object in the request body and translates it into provider-native parameters per the table above. Unsupported flags are silently dropped server-side with a `console.log`.

Token cost adjustments:
- Think: +50% est. tokens (longer outputs)
- Search: +1 token surcharge (tool call overhead)
- Deep Research: +5 token surcharge + actual usage
- Code Exec: +2 token surcharge

Surfaced via the existing `_shared/billing.ts` consumption helper.

## Frontend

**Composer** (`src/components/ChatInput.tsx`): add a row of 4 small pill-toggles above the textarea (Brain, Globe, Telescope, Terminal icons from lucide). State lifted via new `capabilities` prop into `useMessageHandling`. Toggles are sticky for the next send only (auto-reset after send, unless user clicks the pin icon to lock them).

**Agent Settings** (`src/components/AgentSettings.tsx`): new "Capabilities" section per agent with the same 4 switches, persisted in `user_capability_defaults`. Defaults merged: per-message toggle wins over agent default.

**Conductor**: extend `DEFAULT_CONDUCTOR_PROMPT` so the Conductor outputs an optional `[CAPABILITIES: agent=think,search]` line per agent in its route plan. `conductorProcessingService.ts` parses it and passes `capabilities` into each agent call. Heuristics in the prompt:
- time-sensitive / "latest" / "today" → Search on Perplexity + one other
- "analyze deeply", "reason through", "prove" → Think
- "research report", "deep dive" → Deep Research solo on Perplexity or Opus
- "run", "execute", "compute", data crunching → Code Exec on OpenAI/Gemini/Claude

UI badges on agent panes (`AgentPane.tsx`) show active capabilities as small icons next to the model name during a run.

## Files touched

- New: `supabase/migrations/<ts>_user_capability_defaults.sql`
- New: `src/components/chat/CapabilityToggles.tsx`
- New: `src/hooks/useCapabilityDefaults.ts`
- Edit: `ChatInput.tsx`, `AgentSettings.tsx`, `AgentPane.tsx`, `conductorPrompt.ts`, `conductorProcessingService.ts`, `conductorMessageService.ts`, `aiApiService.ts` (thread `capabilities` through), all 8 chat edge functions, `_shared/billing.ts`

## Out of scope (this pass)

- Streaming reasoning summary blocks in UI (just show final answer + "🧠 thought for Xs" footer)
- Image search results rendering
- Code execution sandbox file outputs (return text/console output only)
- Surfacing search citations beyond what Perplexity already does (Claude/OpenAI citations land as plain markdown links)

I can split this into 4 PRs (one per capability) or ship as one if you prefer. Want me to proceed with all four, or start with Think + Search and iterate?
