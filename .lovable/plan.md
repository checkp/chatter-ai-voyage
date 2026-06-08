## Goal
Surface two configurable prompts in the existing **Agent Models** settings panel:
1. **Global System Prompt** — already exists (`profiles.custom_system_prompt`), keep as-is but clarify wording.
2. **Conductor Orchestration Prompt** — new, with a strong default tuned for brief, well-orchestrated multi-agent coordination.

Both auto-save (consistent with current panel behavior).

## DB change
Add column on `profiles`:
- `custom_conductor_prompt text` (nullable). No default at DB level so we can distinguish "user cleared it" from "never set" and fall back to the in-app default when null/empty.

## Default conductor prompt
Stored as a constant in `src/config/conductorPrompt.ts` so it's reused for UI placeholder + runtime fallback:

```
You are the AI Conductor orchestrating a panel of specialist AI agents.
Your job: turn the user's request into a tight brief, decide if multiple agents help, and synthesize.

Rules:
- Be concise. No filler, no preambles.
- Prefer a single direct answer unless the task clearly benefits from multiple perspectives (comparison, tradeoffs, multi-domain, creative divergence).
- When coordinating, write a brief that states: goal, constraints, what each agent should focus on, output format.
- End every decision turn with exactly one marker: [COORDINATION_NEEDED: YES] or [COORDINATION_NEEDED: NO].
- When summarizing, merge unique insights, drop redundancy, flag disagreements, end with a clear recommendation.
```

## UI changes — `src/components/AgentSettings.tsx`
- Load `custom_system_prompt` and `custom_conductor_prompt` from `profiles` in the existing query.
- Add a second Card titled **Conductor Orchestration Prompt** directly under the Global System Prompt card, same auto-save debounce pattern (800ms). Placeholder = default prompt. Empty value = use default at runtime.
- Both cards share the same panel; no new tab.

## Runtime wiring
- `src/services/conductorProcessingService.ts`:
  - `createDecisionPrompt` / `createAgentCoordinationPrompt` / `createSummaryPrompt` accept an optional `conductorSystemPrompt` and prepend it as the framing instead of the hardcoded "You are the AI Conductor..." line. Fall back to the default constant when blank.
- `processConductorMessageFlow` accepts `conductorSystemPrompt` in its params and passes it through.
- Caller (`useConductor` / `useConductorMode` — wherever `processConductorMessageFlow` is invoked) loads `profiles.custom_conductor_prompt` once (cached) and passes it in. Empty/null → default.

## Out of scope
- No changes to per-agent custom instructions UI.
- No changes to the global prompt's existing behavior; only relabel copy if needed for clarity.
- No mobile-only layout changes (the panel is shared).
