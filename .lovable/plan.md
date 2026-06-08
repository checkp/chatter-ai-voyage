## Magazine-style markdown upgrade

Goal: AI replies read like a glossy editorial spread — colorful, hierarchical, alive — while staying legible in the existing chat bubbles. All colors come from new semantic tokens, not raw hex, so light/dark both work.

### New design tokens (`src/index.css` + `tailwind.config.ts`)
Add a small "editorial" palette layered on top of existing semantic tokens:
- `--md-accent-1` magenta/coral, `--md-accent-2` amber, `--md-accent-3` teal, `--md-accent-4` violet (rotating accents per heading level)
- `--md-quote-bg` warm cream tint, `--md-quote-border` accent-1
- `--md-table-head` accent-3 tint with high-contrast foreground
- `--md-rule` gradient stops (accent-1 → accent-2)
- Dark-mode variants for all of the above

### `MarkdownMessage.tsx` element upgrades
- **h1** — display weight, tight tracking, `--md-accent-1` color, thick gradient underline bar (accent-1 → accent-2). Magazine cover energy.
- **h2** — `--md-accent-2`, small uppercase eyebrow tick (a 24px gradient bar before the text using ::before).
- **h3** — `--md-accent-4` italic serif accent (use an editorial serif fallback stack: `'Instrument Serif', 'DM Serif Display', Georgia, serif`) for that magazine-headline feel; keep body in the existing sans.
- **h4** — small caps, tracked, muted accent.
- **p** — first paragraph after an h1/h2 gets a drop-cap (`:first-of-type::first-letter`) in accent-1, 2.6em, float-left.
- **blockquote** — large left bar in accent gradient, italic serif, soft cream background, oversized opening quote glyph via ::before.
- **strong** — highlight-marker effect: subtle yellow underline via `background: linear-gradient(transparent 60%, hsl(var(--md-accent-2)/0.35) 60%)`.
- **em** — serif italic for editorial flair.
- **a** — accent-1 with animated underline-grow on hover.
- **ul/ol** — custom markers: `ul` uses ▸ in accent-3; `ol` uses colored numerals in a rounded chip.
- **hr** — 2px gradient bar (accent-1 → accent-2 → accent-3), no plain line.
- **code (inline)** — accent-4 tinted background, accent-4 text, rounded.
- **pre** — dark slate panel with a thin accent-2 top border (like a code "sticker"), monospace, soft inner shadow.
- **table** — rounded outer container with shadow; `thead` gets accent-3 gradient background with white foreground and uppercase tracked headers; zebra rows alternate transparent + accent-1/5% tint; rounded first/last header cells; hover row highlight.
- **img** — rounded, soft shadow, subtle border.

### Scope guardrails
- Only AI messages render via `MarkdownMessage` (user messages stay clean prose) — already the case.
- Stay inside the chat bubble width; no full-bleed magazine layouts.
- No new fonts loaded from Google by default — use the system editorial serif stack to avoid a font-loading dependency. If the user later wants a real magazine serif, we can add one Google Font then.
- Pure CSS/Tailwind + the existing react-markdown component overrides. No new libraries.

### Files touched
- `src/index.css` — add `--md-*` tokens (light + dark)
- `tailwind.config.ts` — expose the tokens as colors so components can use them
- `src/components/chat/MarkdownMessage.tsx` — restyle every element override per above; add drop-cap and ::before details via a scoped `.markdown-body` class block in `index.css`

### Out of scope
- No changes to chat layout, bubbles, or message ordering.
- No changes to user-message styling.
- No design-direction screenshots needed — the styling is element-level inside an existing component and you've already given a clear aesthetic ("colorful, joyful, magazine"). If after build you want alternative moods (e.g. "more Wired", "more Kinfolk", "more Vogue") I can spin design directions then.
