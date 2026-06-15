
## How file uploads to agents work

Every provider we use (OpenAI, Anthropic, Google, xAI/Grok, DeepSeek, Mistral, Perplexity, Qwen) takes files inline in the chat request — there is no separate "upload" step for our use case. The file is base64-encoded (or a public URL) and added as a typed content block inside the user message. Each provider has its own block shape:

- **OpenAI** (`gpt-4o`, `gpt-5`, `gpt-image`): `{type:"image_url", image_url:{url}}` for images, `{type:"input_audio",...}` for audio, `{type:"file", file:{filename, file_data}}` for PDFs.
- **Anthropic** (Claude 3.5+/4): `{type:"image", source:{type:"base64", media_type, data}}` and `{type:"document", source:{...}}` for PDFs.
- **Google Gemini** (1.5/2.0/2.5): `inline_data:{mime_type, data}` parts — supports images, audio, video, PDFs.
- **xAI Grok** (`grok-2-vision`, `grok-4`): OpenAI-compatible `image_url` blocks (images only).
- **Mistral** (`pixtral-*`, `mistral-large` with vision): OpenAI-compatible `image_url`.
- **DeepSeek**: text-only today — no file support.
- **Perplexity Sonar**: text-only in API (image input not exposed).
- **Qwen** (`qwen-vl-*`): `image_url` blocks; base `qwen-max/plus/turbo` are text-only.

### Can we get capabilities from an API?

Partially. There is no single cross-provider "capabilities" endpoint:
- **OpenAI** `/v1/models` returns IDs only, no modalities.
- **Anthropic** `/v1/models` returns IDs only.
- **Google** `/v1beta/models` returns `supportedGenerationMethods` and `inputTokenLimit` but no explicit modality list.
- **xAI/Mistral/DeepSeek/Qwen/Perplexity** `/v1/models` are OpenAI-style ID lists.

In practice everyone (LangChain, OpenRouter, Vercel AI SDK) maintains a hand-curated capability map. We already do this — `src/config/aiModels.ts` has a `capabilities: ['text','vision',...]` array per model. That is the source of truth we should use and extend (e.g. add `'audio'`, `'pdf'`, `'video'`).

A complementary option: OpenRouter's `https://openrouter.ai/api/v1/models` endpoint returns `architecture.input_modalities: ["text","image","file",...]` for hundreds of models across providers. We could pull it nightly in `sync-model-pricing` to refresh our local map automatically.

## Proposed implementation

### 1. Capability source of truth
- Extend `ModelConfig.capabilities` vocabulary: `text | vision | audio | pdf | video`.
- Update META entries in `src/config/aiModels.ts` with accurate modality flags per current docs.
- Add helper `modelSupports(modelId, 'vision' | 'pdf' | 'audio')` exported from `aiModels.ts`.
- (Optional, follow-up) Extend `sync-model-pricing` edge function to also fetch OpenRouter's `/models` and write `input_modalities` into a new `model_pricing.input_modalities text[]` column so the META map stays current automatically.

### 2. UI: attach button in `ChatInput`
- Add a paperclip button next to Sparkles. Opens a hidden `<input type="file" multiple>`.
- Accepted MIME types derived from the currently-enabled agents' combined capabilities (union of supported types). If no enabled agent supports a type, disable the button with a tooltip explaining why.
- Show selected files as small chips above the textarea with a remove (×). Enforce: max 10 files, 20 MB each (match Lovable's own limits).
- Files are read as base64 in the browser (small) or uploaded to a private Supabase Storage bucket `chat-attachments` and referenced by signed URL (>2 MB). New bucket + owner-scoped RLS migration required.

### 3. Message shape
- Extend `types/chat.ts` `Message` with optional `attachments: Array<{id, name, mimeType, size, storagePath?, dataUrl?}>`.
- Persist `attachments` JSONB on `messages` table (migration).
- Render attachment chips in `ChatMessages` / `MarkdownMessage` (image thumbnails, file icon + name for others).

### 4. Edge function fan-out
- Each `<provider>-chat` edge function gets a small `buildContentBlocks(text, attachments, model)` helper that:
  - Skips the call entirely for an agent if any attachment type is unsupported by that model — surfaces an "X skipped: model doesn't support PDF" status in the UI instead of erroring.
  - Otherwise translates our normalized attachments into provider-native blocks (image_url for OpenAI/Grok/Mistral/Qwen-vl; image/document source for Anthropic; inline_data for Gemini).
- Files referenced by storage path are fetched server-side, base64-encoded, and embedded — never expose signed URLs to third-party providers.

### 5. Conductor + Free / Side-by-side modes
- Attachments propagate exactly like message text. Conductor router strips attachments before its planning call (text-only) but forwards them to executor agents.

### 6. Token cost
- Add per-modality surcharge using each provider's documented image/audio token formula (e.g. OpenAI 85 + 170·tiles, Anthropic ~1.6k tokens/image). Display the estimate in the chip row, similar to the existing image-gen estimate.

## Technical notes

- Storage: new private bucket `chat-attachments`, signed-URL pattern reused from existing image storage (see `mem://technical/storage-security`).
- Security: validate MIME + size server-side in edge functions; reject anything > 20 MB; derive `user_id` from JWT, not body.
- Backwards compatibility: `attachments` defaults to `[]`; all existing flows unaffected.
- Out of scope for v1: video (only Gemini supports it), audio output, OCR fallback for unsupported providers.

## Deliverables checklist
1. Migration: `messages.attachments jsonb default '[]'`, new `chat-attachments` storage bucket + RLS, optional `model_pricing.input_modalities`.
2. `aiModels.ts` capability refresh + `modelSupports` helper.
3. `ChatInput.tsx` attach button, chip preview, validation.
4. `ChatMessages` / message renderer chip + thumbnail rendering.
5. Per-provider edge function `buildContentBlocks` helpers + graceful "model doesn't support this attachment" skip status.
6. (Follow-up) `sync-model-pricing` pulls OpenRouter modalities nightly.
