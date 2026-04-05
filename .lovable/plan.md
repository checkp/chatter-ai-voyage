

## Problem: Multiple AI Models Are Failing Due to Deprecated/Changed APIs

The edge function logs reveal four distinct API errors:

1. **OpenAI (gpt-5)**: `max_tokens` parameter is unsupported; must use `max_completion_tokens` instead
2. **Claude (claude-3-5-sonnet-20241022)**: Model not found (404) -- this model ID has been retired by Anthropic
3. **Grok (grok-4-heavy)**: 400 error -- likely the model ID or `max_tokens` parameter issue similar to OpenAI
4. **Gemini (gemini-1.5-pro)**: Model not found (404) -- deprecated from the v1beta API

DeepSeek works because its API hasn't changed.

## Plan

### Step 1: Fix OpenAI edge function
- Replace `max_tokens` with `max_completion_tokens` in `supabase/functions/openai-chat/index.ts`

### Step 2: Fix Claude edge function  
- Update the Anthropic API call in `supabase/functions/claude-chat/index.ts` to use current model IDs
- Update the default model and model list in `src/config/aiModels.ts` to use `claude-sonnet-4-20250514` (or latest available)

### Step 3: Fix Grok edge function
- Replace `max_tokens` with `max_completion_tokens` in `supabase/functions/grok-chat/index.ts` (X.AI uses OpenAI-compatible API)
- Log the actual error text for better debugging

### Step 4: Fix Gemini edge function
- Update the API URL from `v1beta` to `v1` or use a currently available model
- Update model IDs in `src/config/aiModels.ts` to use `gemini-2.0-flash` (current) instead of deprecated `gemini-1.5-pro`

### Step 5: Update model configuration
- Update `src/config/aiModels.ts` with current model IDs for all platforms
- Update `src/hooks/auth/userSetupOperations.ts` default models to match

### Step 6: Update default model in database setup
- Ensure `ensureDefaultAgentSettings` uses valid model IDs for new users

### Technical Details

| Platform | Current (broken) model | Fix |
|----------|----------------------|-----|
| OpenAI | gpt-5 + `max_tokens` | Use `max_completion_tokens` param |
| Claude | claude-3-5-sonnet-20241022 | Use `claude-sonnet-4-20250514` |
| Grok | grok-4-heavy + `max_tokens` | Use `max_completion_tokens` param |
| Gemini | gemini-1.5-pro (v1beta) | Use `gemini-2.0-flash` |

Files to modify:
- `supabase/functions/openai-chat/index.ts`
- `supabase/functions/claude-chat/index.ts`
- `supabase/functions/grok-chat/index.ts`
- `supabase/functions/gemini-chat/index.ts`
- `src/config/aiModels.ts`
- `src/hooks/auth/userSetupOperations.ts`

