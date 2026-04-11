

## Plan: Add Mistral AI and Perplexity AI as New Agents

### Overview
Add two new AI providers — **Mistral AI** and **Perplexity AI** — following the exact same patterns as the existing 5 agents. This brings the total to 7 frontier models.

### 1. Create Edge Functions

**`supabase/functions/mistral-chat/index.ts`** — Same structure as `openai-chat/index.ts` but calling `https://api.mistral.ai/v1/chat/completions` with `MISTRAL_API_KEY`. Default model: `mistral-large-latest`.

**`supabase/functions/perplexity-chat/index.ts`** — Same structure but calling `https://api.perplexity.ai/chat/completions` with `PERPLEXITY_API_KEY`. Default model: `sonar-pro`. Perplexity returns `citations` in responses — we'll append them to the content.

### 2. Add API Keys as Secrets
- `MISTRAL_API_KEY` — from https://console.mistral.ai
- `PERPLEXITY_API_KEY` — via the Perplexity connector (already available)

### 3. Update Config
**`supabase/config.toml`** — Add `[functions.mistral-chat]` and `[functions.perplexity-chat]` with `verify_jwt = true`.

### 4. Update AI Models Config
**`src/config/aiModels.ts`** — Add `mistral` and `perplexity` entries:
- Mistral: `mistral-large-latest` (high), `mistral-medium-latest` (medium), `mistral-small-latest` (low), `codestral-latest` (coding)
- Perplexity: `sonar-pro` (search+reasoning), `sonar` (fast search), `sonar-reasoning-pro` (deep reasoning)

### 5. Update Service Layer
**`src/services/aiApiService.ts`** — Add `callMistralAPI` and `callPerplexityAPI` functions following existing patterns.

### 6. Update Platform Hook
**`src/hooks/usePlatforms.ts`**:
- Add `mistral` and `perplexity` to the default platforms array with icons 🌀 and 🔮
- Add cases in `callAIAPI` switch

### 7. Update Supporting Files
- **`src/hooks/auth/userSetupOperations.ts`** — Add mistral and perplexity to default agent settings
- **`src/components/ai-status/StatusBarUtils.ts`** — Add icons for new platforms
- **`src/components/landing/AIModelsSection.tsx`** — Add Mistral and Perplexity to the showcase (now truly 7 models)
- **`src/components/landing/LandingHeroSection.tsx`** — Update copy to include Mistral and Perplexity
- **`src/data/changelog.ts`** — Add changelog entry for new agents

### 8. Add Theme Colors
**`tailwind.config.ts`** — Add `agent-mistral` (orange) and `agent-perplexity` (teal) colors.

### Technical Notes
- Mistral API is OpenAI-compatible format, so the edge function is nearly identical to OpenAI's
- Perplexity connector is available but we need the `PERPLEXITY_API_KEY` secret for the edge function
- Both platforms use `platform` field in `model_pricing` table for token cost tracking

