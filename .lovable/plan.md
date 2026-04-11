

## Plan: Streamline Onboarding, Fix Side-by-Side Layout, and Add Concise Default Mode

### 1. Shorten the Onboarding (WelcomeScreen.tsx)

**Problem**: Page 2 is massive -- 4 sample prompts + a huge Conductor prompt + a pro tip card.

**Solution**: Collapse pages 1 and 2 into a single screen:
- Keep the 3 feature cards (Multi-AI, Private Agent, Conductor) from page 1
- Remove page 2 entirely (sample prompts and conductor prompt) -- users don't need to copy prompts manually
- Keep "What's New" as optional page 2
- Single "Start Chatting" button that calls `onGetStarted` directly

### 2. Fix Side-by-Side Layout (SideBySideLayout.tsx)

**Problem**: The outer `ScrollArea` wraps the flex container but there's no horizontal scroll, and individual agent windows lack proper vertical scrolling.

**Changes**:
- Replace the outer `ScrollArea` with a div that has `overflow-x-auto` for horizontal scrolling
- Give the inner flex container a fixed height (`h-full`) so agent windows fill the available space
- Each agent window already has `ScrollArea` on `flex-1` -- ensure the parent container has a defined height so the scroll area activates properly
- Set agent windows to a reasonable `w-80` with `flex-shrink-0` instead of just `min-w-80`

### 3. Default to Concise "Simple" Mode (usePlatforms.ts)

**Problem**: Agents are too verbose and don't have awareness of the chat environment by default, leading to a poor first impression.

**Changes in `usePlatforms.ts` `callAIAPI` function**:
- Inject a system-level context message that:
  - Tells agents they're in a multi-AI collaborative chat app
  - Instructs them to be **concise** -- short paragraphs, direct answers, no filler
  - Sets a "keep it under 150 words unless complexity demands more" guideline
- Update both the `discussion` and `isolated` context messages to include conciseness instructions
- Change the context injection from `role: 'user'` to `role: 'system'` (OpenAI/DeepSeek/Grok support this; for Claude it gets handled as the first user message which is fine)

**Updated prompt examples**:
- Discussion mode: "You are {name} in a multi-AI chat app alongside {others}. Be concise and direct. Keep responses under 150 words unless the topic requires depth. Add unique value, don't repeat what others said."
- Isolated mode: "You are {name}. Be concise and direct. Keep responses under 150 words unless the topic requires depth."

### Files to Edit

| File | Change |
|------|--------|
| `src/components/WelcomeScreen.tsx` | Merge pages 1+2 into single page, remove sample prompts |
| `src/components/SideBySideLayout.tsx` | Fix horizontal scroll, ensure per-agent vertical scroll |
| `src/hooks/usePlatforms.ts` | Update context prompts to be concise-by-default |

