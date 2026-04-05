

## Plan: Add Retry Logic, Improve Error Messages, and Restyle Toasts

### 1. Add shared retry wrapper with session validation (`src/services/aiApiService.ts`)

- Create a `withRetry` helper function (3 attempts, exponential backoff) that also refreshes the auth session before each attempt
- Apply it to `callOpenAI`, `callDeepSeek`, `callGrokAPI`, and `callGeminiAPI` (Claude already has retries)
- Detect `TypeError` / "Load failed" and throw a friendly "Network error" message

### 2. Improve error messages in `src/hooks/useMessageHandling.ts`

- In the `onError` handler and per-platform catch blocks, detect `TypeError` / "Load failed" patterns and replace with user-friendly messages like "Network error — please try again"
- Detect "Not authenticated" / session errors and show "Session expired — please refresh"

### 3. Move toasts to bottom-left and make them less intrusive (`src/components/ui/sonner.tsx`)

- Set Sonner `position="bottom-left"` 
- Reduce toast styling: smaller text, softer shadow, subtle border, semi-transparent background, shorter duration (3s)
- Add `richColors={false}` for a more muted look

### 4. Clean up duplicate Toaster (`src/App.tsx`)

- Remove the legacy `<Toaster />` import from `@/components/ui/toaster` since the app uses sonner's `toast()` — having both is unnecessary

### Files to modify
- `src/services/aiApiService.ts` — retry wrapper + session refresh
- `src/hooks/useMessageHandling.ts` — friendly error messages  
- `src/components/ui/sonner.tsx` — position bottom-left, subtler styling
- `src/App.tsx` — remove duplicate legacy Toaster

