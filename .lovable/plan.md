# Multi-Agent Collaborative Image Generation

Transform image requests into a collaborative flow: all 7 chat agents propose prompts → Conductor merges into one master prompt → selected image models render in parallel → results display inline as big thumbnails in chat.

## User flow

1. User types in chat (e.g. "make me a cyberpunk cat").
2. Trigger fires in two ways:
   - **Auto-detect** via existing `isImageGenerationIntent` → shows a confirmation chip ("🎨 Image request detected — pick models") with model checkboxes + total token cost.
   - **Explicit**: `/image` slash command or a 🎨 button in the composer opens the same picker directly.
3. Picker shows 4 image models with per-model token costs; user selects any subset (defaults to cheapest: Gemini 2.5 Flash). Total cost shown live.
4. User confirms → fan-out begins.
5. **Phase 1 — Prompt collaboration**: All 7 chat agents (ChatGPT, Claude, DeepSeek, Grok, Gemini, Mistral, Perplexity) each propose a one-line refined image prompt in parallel (short, ~50 tokens each). UI shows a collapsed "Agents drafting prompt…" status card.
6. **Phase 2 — Conductor merge**: Conductor receives all 7 proposals + original request, synthesizes one master prompt. Master prompt is shown expanded above the image grid.
7. **Phase 3 — Parallel image gen**: All selected image models fire simultaneously with the master prompt. Each renders inline as a big thumbnail card (label, model name, loading shimmer → image, token cost).
8. Click thumbnail → lightbox with download / regenerate / "send to image page" actions.

## UI changes

- **New message type** `image_panel` in chat: renders the prompt-collaboration card + master prompt + responsive grid (2 cols desktop, 1 mobile) of large thumbnails (~400px wide).
- **Image picker modal/chip** in `ChatInput.tsx`: triggered by detector, `/image`, or 🎨 button. Shows model list w/ checkboxes, cost preview, confirm/cancel.
- **Composer button**: new 🎨 icon next to send.
- Thumbnails use existing signed-URL refresh pattern from `useImageGeneration`.

## Data / backend changes

- **New edge function `multi-image-generate`**:
  - Input: `{ userPrompt, models: string[], chatId }`.
  - Phase 1: parallel calls to 7 chat providers with a tight "Propose a single vivid image prompt (≤30 words)" instruction.
  - Phase 2: Conductor call (Claude or Gemini Pro) merges into final prompt.
  - Phase 3: parallel calls to selected image models (reuses logic from existing `generate-image` function — extract shared helpers into `_shared/image-providers.ts`).
  - Streams progress via SSE: `prompts_ready`, `master_prompt`, `image_started:<model>`, `image_done:<model>`, `image_error:<model>`.
  - Token consumption: deducts per-model cost only on success; rolls back failed ones.
- **`messages` table**: extend `metadata` JSONB to store `{ type: 'image_panel', masterPrompt, proposals: [...], images: [{model, url, file_name, tokens}] }`. No schema migration needed if metadata column exists; otherwise add it.
- **Storage**: reuse `generated-images` bucket, owner-scoped.

## Files affected

```text
src/
  components/
    chat/
      ImagePanel.tsx                (new — renders inline grid)
      ImageModelPicker.tsx          (new — modal/chip)
      ImageThumbnailCard.tsx        (new — single image card w/ lightbox)
    ChatInput.tsx                   (add 🎨 button + /image command)
    ChatMessages.tsx                (render image_panel message type)
  hooks/
    useMultiImageGeneration.ts      (new — orchestrates SSE + state)
  utils/
    intentDetection.ts              (reuse as-is)
supabase/functions/
  multi-image-generate/index.ts     (new)
  _shared/image-providers.ts        (new — extracted from generate-image)
  _shared/chat-providers.ts         (new — unified 7-agent caller)
```

## Token cost transparency

Picker always shows: per-model cost, total selected, user's current balance. Submit disabled if insufficient. Prompt-collaboration phase costs ~50 tokens (7 small chat calls + 1 merge) — included in the total.

## Defaults

- Picker pre-selects: Gemini 2.5 Flash (15) only — cheapest baseline.
- User can save preferred default selection in agent settings (future, not in this plan).

## Out of scope

- Saving the master prompt to a prompt library.
- Image-to-image / editing flows.
- Grok image model (not in selected list).
- Per-user default model preference (manual pick each time for now).
