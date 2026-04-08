

## Rework Image Generation Panel

### Current State
- Only supports OpenAI DALL-E 2/3 and GPT Image 1
- Plain card-based layout, basic form with model/size selects
- Edge function only calls OpenAI's image API

### Changes

**1. `src/components/ImageGeneration.tsx` — UI Redesign + New Engines**
- Add engine selector with visual cards instead of plain dropdown: **OpenAI** (DALL-E 3, GPT Image 1), **Google Gemini** (Gemini Image, Gemini Pro Image), **Grok** (Aurora)
- Replace plain input with a larger textarea for prompts
- Add style preset chips (Photorealistic, Digital Art, Anime, Oil Painting, 3D Render, Watercolor)
- Show selected engine's badge with cost, speed indicator, and capabilities
- Improve gallery: add lightbox-style image preview on click, better grid with masonry-like layout, date grouping
- Add aspect ratio visual selector (square, landscape, portrait icons) instead of text dropdown
- Update `getTokenCost` to cover all new engines

**2. `supabase/functions/generate-image/index.ts` — Multi-Engine Support**
- Add routing logic based on `model` parameter:
  - `dall-e-3`, `gpt-image-1` → OpenAI API (existing)
  - `gemini-image`, `gemini-pro-image` → Lovable AI Gateway (`google/gemini-2.5-flash-image`, `google/gemini-3-pro-image-preview`)
  - `grok-aurora` → Grok/xAI image API using `XAI_API_KEY`
- Extract base64 from each provider's response format
- Keep existing storage upload + token deduction logic unchanged

**3. `src/hooks/useImageGeneration.ts` — No structural changes**
- Only minor: pass `style` parameter through to edge function if style presets are selected

**4. `src/pages/ImageGeneration.tsx` — Minor polish**
- Add gradient background accent to header area

### Technical Details

Engine routing in edge function:
```text
model param        → API endpoint
─────────────────────────────────────
dall-e-3           → OpenAI /v1/images/generations
gpt-image-1        → OpenAI /v1/images/generations  
gemini-image       → Lovable AI Gateway (gemini-2.5-flash-image)
gemini-pro-image   → Lovable AI Gateway (gemini-3-pro-image-preview)
grok-aurora        → xAI grok-2-image-gen endpoint
```

Size options vary by engine — the UI will dynamically show valid sizes per selected model.

