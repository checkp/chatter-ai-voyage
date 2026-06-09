
## Add Pollinations.ai as 7th image provider

### 1. Secret
Add `POLLINATIONS_API_KEY` via the secrets tool so the edge function can read it from `Deno.env`.

### 2. Model catalog (`src/config/imageModels.ts`)
Add one entry, enabled by default alongside the existing 6:
```
{ id: 'pollinations-flux', label: 'Pollinations FLUX', provider: 'Pollinations', cost: 10, description: 'Open-source FLUX' }
```
Lowest cost in the lineup since Pollinations is free.

### 3. Edge function (`supabase/functions/multi-image-generate/index.ts`)
- Extend `IMAGE_MODELS` map with `pollinations-flux` → provider `pollinations`, cost 10.
- Add `generateWithPollinations(prompt)`:
  - GET `https://image.pollinations.ai/prompt/{encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&private=true&safe=false&seed={random}`
  - Header `Authorization: Bearer ${POLLINATIONS_API_KEY}` (token unlocks tier, removes watermark, raises rate limits)
  - Response is the raw PNG/JPEG bytes → return as `Uint8Array`
  - Wrap in 3-retry exponential backoff per project's AI resilience rule
- Add `pollinations` branch in the provider switch inside the parallel image-gen block.

### 4. Default selection (`src/components/chat/ImageModelPicker.tsx`)
Append `'pollinations-flux'` to `DEFAULT_SELECTED_MODELS` so all 7 providers are checked by default.

### 5. Changelog (`src/data/changelog.ts`)
New entry: "Added Pollinations FLUX as a 7th image generator (open-source, low cost)."

### 6. Deploy
Redeploy `multi-image-generate` after edits.

### Notes
- No DB schema changes — uses existing `generated_images` table and `generated-images` bucket.
- No frontend logic changes beyond the model list; UI already iterates `data.images` dynamically.
- Pollinations returns image bytes directly, so no polling (unlike Qwen) and no base64 decode (unlike OpenAI/Gemini).
