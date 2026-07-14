
# Add NVIDIA as a new AI provider

NVIDIA's `integrate.api.nvidia.com` is OpenAI-compatible and exposes ~140 models. We'll add it as a first-class provider alongside OpenAI, DeepSeek, Grok, Claude, Gemini, Mistral, Perplexity, Qwen.

## 1. Secret
- Add `NVIDIA_API_KEY` via `add_secret` (format hint: `nvapi-...`).

## 2. Edge function: `supabase/functions/nvidia-chat/index.ts`
- Clone the `deepseek-chat` structure (OpenAI-compatible, JWT auth from header, `deduct_user_tokens`, `token_transactions` insert, CORS).
- Endpoint: `POST https://integrate.api.nvidia.com/v1/chat/completions`, header `Authorization: Bearer ${NVIDIA_API_KEY}`.
- Body: `{ model, messages, max_tokens, stream: false }`. For vision-capable models, forward `attachments` as OpenAI-format `image_url` content parts (same shape as `openai-chat`).
- Token accounting: read `usage.total_tokens`; cost per model looked up from `model_pricing` table (fallback: flat rate similar to Mistral).
- Deploy.

## 3. Client service: `src/services/aiApiService.ts`
- Add `callNvidiaAPI(history, user, model, attachments, capabilities)` — mirror `callOpenAI`, invoke `nvidia-chat`.

## 4. Model registry: `src/config/aiModels.ts`
Add a new `nvidia` platform with grouped models:

**Chat / reasoning (default group)**
- `nvidia/nemotron-3-ultra-550b-a55b`
- `nvidia/nemotron-3-super-120b-a12b`
- `nvidia/nemotron-nano-3-30b-a3b`
- `nvidia/llama-3.1-nemotron-ultra-253b-v1`
- `nvidia/llama-3.3-nemotron-super-49b-v1.5`
- `deepseek-ai/deepseek-v4-pro`, `deepseek-ai/deepseek-v4-flash`
- `mistralai/mistral-large-3-675b-instruct-2512`
- `mistralai/mistral-nemotron`, `mistralai/mistral-medium-3.5-128b`
- `qwen/qwen3.5-397b-a17b`, `qwen/qwen3.5-122b-a10b`, `qwen/qwen3-next-80b-a3b-instruct`
- `moonshotai/kimi-k2.6`, `z-ai/glm-5.2`, `minimaxai/minimax-m3`
- `openai/gpt-oss-120b`, `openai/gpt-oss-20b`
- `meta/llama-4-maverick-17b-128e-instruct`, `meta/llama-3.3-70b-instruct`

**Vision (attachments enabled)**
- `nvidia/nemotron-nano-12b-v2-vl`, `nvidia/cosmos-reason2-8b`, `nvidia/llama-3.1-nemotron-nano-vl-8b-v1`
- `meta/llama-3.2-90b-vision-instruct`, `meta/llama-3.2-11b-vision-instruct`
- `microsoft/phi-4-multimodal-instruct`

**Coding**
- `bigcode/starcoder2-15b`, `mistralai/codestral-22b-instruct-v0.1`, `ibm/granite-34b-code-instruct`

**Domain-specialized**
- `writer/palmyra-med-70b-32k`, `writer/palmyra-fin-70b-32k`, `writer/palmyra-creative-122b`
- `stockmark/stockmark-2-100b-instruct` (Japanese), `sarvamai/sarvam-m` (Indic)

**Safety guards** (surfaced only in an admin/guard picker, not the default chat)
- `meta/llama-guard-4-12b`, `nvidia/llama-3.1-nemoguard-8b-content-safety`, `nvidia/nemotron-content-safety-reasoning-4b`, `nvidia/gliner-pii`

**Embeddings** (routed to `embed-messages` edge function, not chat picker)
- `nvidia/nv-embedqa-e5-v5`, `nvidia/llama-3.2-nv-embedqa-1b-v1`, `nvidia/nv-embedcode-7b-v1`, `baai/bge-m3`

**Document parse** (surfaced as a Tools-page utility)
- `nvidia/nemotron-parse`, `nvidia/nemoretriever-parse`

**Translation** (Tools page)
- `nvidia/riva-translate-4b-instruct-v1.1`

## 5. UI wiring
- Add NVIDIA logo/branding in `PlatformStatus` and `ModelSelector`.
- Group toggle in Settings (enable/disable NVIDIA models same as other providers).
- Vision flag drives the attachment picker; safety/embed/parse/translate hidden from chat selector.

## 6. Routing hooks
- `useMessageHandling` / conductor / discussion: add `nvidia` case that calls `callNvidiaAPI`.
- MCP tool `ask_model` and REST `/v1/chat`: add `nvidia` platform alias.

## 7. Pricing sync
- Extend `sync-model-pricing` edge function with NVIDIA entries (NVIDIA's public rate card is per-1M-tokens; store input/output cost). Admin can edit later via `AdminModelPricing`.

## 8. Docs
- Update `src/data/features.ts` + `src/data/changelog.ts` (bump version) noting "8 providers → 9, +NVIDIA (140 models incl. Nemotron Ultra 550B, DeepSeek V4 Pro, Kimi K2.6, GPT-OSS)".
- Add NVIDIA to landing `AIModelsSection` and homepage marketing copy.

## Technical notes
- NVIDIA API is strictly OpenAI-compatible — no request reshape needed for text; vision uses standard `content: [{type:"text"}, {type:"image_url", image_url:{url:"data:..."}}]`.
- Free tier: 1000 credits/mo per personal `nvapi-` key; enterprise keys metered. Surface 402/429 the same way existing providers do.
- No streaming in v1 (matches existing providers).
- All 140 model IDs already fetched live from `GET /v1/models` — we can optionally add an admin "sync NVIDIA models" button that repopulates the picker from that endpoint.
