## Fun Mode

A toggle that lets the chat window restyle itself based on what's being discussed. Each new assistant round nudges the look — colors, bubble shapes, accents, font pairing — so the same conversation gradually drifts into its own visual identity. Text always stays readable.

### How it works for the user
- New **Fun mode** toggle in the chat header (sparkle/paint icon). Off by default.
- When on, after each assistant reply the chat surface re-themes itself: page background tint, user bubble, AI bubble, accent line, heading font, corner radius, subtle shadow.
- Each update is a small evolution of the previous theme, not a hard reset, so it "drifts" rather than flickers.
- Turning it off snaps back to the standard look instantly. State is per-chat and remembered.

### Readability guarantees
- Foreground/background pairs are passed through a WCAG contrast check (≥ 4.5:1 for body, ≥ 3:1 for large text). If the AI picks a low-contrast pair, we auto-snap the foreground to near-black or near-white — whichever wins.
- Font is restricted to a curated whitelist of legible Google fonts (e.g. Inter, Fraunces, Space Grotesk, DM Serif, JetBrains Mono, Caveat). The AI picks from the list; it can't invent fonts.
- Saturation/lightness clamped so backgrounds never become neon or pitch-black, and bubbles always sit visibly on the page background.

### Where it applies
- Standard chat (`ChatMessages.tsx`).
- Side-by-side and Conductor panes read the same theme so all chat surfaces in the active conversation stay in sync.
- Image panels, headers, sidebar, settings — untouched.

### Cost / safety
- One generation per completed assistant round, debounced; skipped if the round produced no new assistant text.
- Hard cap (e.g. 40 theme updates per chat) to keep token use bounded.
- Falls back silently to the previous theme if the call fails or returns invalid JSON.

---

### Technical details

**New edge function** `supabase/functions/generate-fun-theme/`
- `verify_jwt = true`, uses `LOVABLE_API_KEY` with `google/gemini-2.5-flash`.
- Input: last ~6 messages (trimmed), previous theme JSON, evolution seed.
- Prompt instructs the model to return strict JSON only, evolving the prior theme by ~10–25% (hue shift, one font swap allowed every N rounds, radius/shadow nudge), and pick from a fixed font whitelist.
- Server-side `zod` validation; reject anything off-list; return 400 on parse failure.
- Tokens: lightweight call, not metered against user balance for v1 (noted in changelog).

**Theme shape**
```ts
type FunTheme = {
  vibe: string;              // short label, e.g. "midnight library"
  bg: string;                // page tint, hsl
  userBubbleBg: string;
  userBubbleFg: string;
  aiBubbleBg: string;
  aiBubbleFg: string;
  accent: string;            // border-l / links
  headingFont: FontKey;      // from whitelist
  bodyFont: FontKey;         // from whitelist
  radius: number;            // 6–24px
  shadow: 'none'|'soft'|'lifted';
};
```

**New client modules**
- `src/lib/funTheme.ts` — font whitelist, contrast helpers (`ensureReadable(fg, bg)`), HSL clamps, theme→CSS-vars mapper.
- `src/contexts/FunThemeContext.tsx` — provider keyed by `chatId`, exposes `{ enabled, toggle, theme, regenerate }`. Persists `enabled` + last theme per chat in `localStorage` (`fun-mode:<chatId>`).
- `src/hooks/useFunModeTrigger.ts` — watches messages; when a new assistant message arrives and fun mode is on, calls `generate-fun-theme` (debounced, cap-checked), runs `ensureReadable`, updates context.

**UI changes**
- `ChatHeader.tsx` (or `header/ChatModeControls.tsx`): add toggle button with active state + tooltip showing current `vibe`.
- `ChatMessages.tsx`: wrap output in a `<div data-fun={enabled}>` that consumes CSS vars (`--fun-bg`, `--fun-user-bg`, `--fun-user-fg`, `--fun-ai-bg`, `--fun-ai-fg`, `--fun-accent`, `--fun-radius`, `--fun-font-heading`, `--fun-font-body`). Existing platform-tinted classes stay as the off-state default.
- Same wrapper applied in `SideBySideLayout.tsx` and `conductor/AgentPane.tsx` so all chat surfaces inherit the theme.
- Fonts loaded once via a `<link>` in `index.html` (whitelist only).

**Fallback behavior**
- No theme yet, or fun mode off → existing styling, no change.
- Edge function error → keep previous theme, log to console, no toast spam.

### Out of scope (v1)
- Animating between themes (cross-fade can come later).
- Per-message stylistic flourishes.
- Syncing theme to DB across devices — local only for v1.
- Free/Discussion mode-specific tuning beyond the shared theme.
