## Two fixes

### 1. Images not appearing in chat

`src/components/ChatInput.tsx` has a recursion bug — `onSendClick` calls itself instead of `handleSend()`:

```ts
const onSendClick = () => {
  if (looksLikeImage && onGenerateImages) { setPickerOpen(true); return; }
  onSendClick(); // ← infinite loop, should be handleSend()
};
```

Effect: pressing Send (or Enter) on a non-image message hangs; for image-intent text the picker does open but if anything else regressed users see nothing land in chat. Fix: call `handleSend()`.

Also verify the picker → `onGenerateImages` → `useMultiImageGeneration` → `messages` insert path renders an `ImagePanel`. If the edge function returns a 500, surface the error inline as an assistant message instead of failing silently, so the user sees *something* in chat.

Conductor model name is also stale: `google/gemini-3-flash-preview` (line 153 of `multi-image-generate/index.ts`) — switch to `google/gemini-2.5-flash` so phase-2 doesn't throw (currently caught silently, falling back to raw user prompt, but still noisy).

### 2. Markdown rendering for AI messages

Today `ChatMessages.tsx` renders message content as plain `whitespace-pre-wrap` text. Add rich rendering for `sender === 'ai'` messages (user messages stay plain to keep their prompts literal).

Approach:
- Add deps: `react-markdown`, `remark-gfm` (tables, strikethrough, task lists, autolinks), `rehype-raw` is **not** added (avoid HTML injection from model output).
- New component `src/components/chat/MarkdownMessage.tsx` wrapping `<ReactMarkdown remarkPlugins={[remarkGfm]}>` with Tailwind-styled element overrides:
  - Headings (`h1`–`h4`), `p`, `ul/ol/li`, `blockquote`
  - `code` inline vs fenced (`pre > code`) with `bg-muted`, rounded, monospace
  - `table` / `thead` / `tbody` / `tr` / `th` / `td` — bordered, zebra rows, horizontal scroll wrapper
  - `a` — `text-primary underline`, `target="_blank" rel="noreferrer"`
  - `strong`, `em`, `hr`
- Use design tokens only (no raw colors).
- Replace the `whitespace-pre-wrap` div in `ChatMessages.tsx` with `<MarkdownMessage content={message.content} />` for AI messages.
- Also use it inside `ConductorLayout` / `AgentPane` AI bubbles (quick check for symmetry — only if they render message bodies directly).
- Update each agent's default system prompt in `src/config/defaultPrompts.ts` to nudge expressive markdown ("Use markdown — headings, **bold**, lists, and tables when helpful").

### Out of scope
- No changes to message storage shape (still plain string in `messages.content`).
- No syntax-highlighting library yet (keep bundle small); fenced code blocks render as styled monospace blocks.
- Image panel rendering already exists and is unchanged aside from the recursion bug fix above.

### Files touched
- `src/components/ChatInput.tsx` — fix recursion
- `supabase/functions/multi-image-generate/index.ts` — fix conductor model id
- `src/components/chat/MarkdownMessage.tsx` — new
- `src/components/ChatMessages.tsx` — use MarkdownMessage for AI text
- `src/components/conductor/AgentPane.tsx`, `ConductorPane.tsx` — use MarkdownMessage if they render bodies
- `src/config/defaultPrompts.ts` — nudge markdown usage
- `package.json` — add `react-markdown`, `remark-gfm`
