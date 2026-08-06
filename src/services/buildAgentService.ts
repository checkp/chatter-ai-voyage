import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform } from '@/types/chat';
import {
  callOpenAI, callDeepSeek, callClaudeAPI, callGrokAPI, callGeminiAPI,
  callMistralAPI, callPerplexityAPI, callQwenAPI, callNvidiaAPI, callLocalAPI,
} from '@/services/aiApiService';

export type History = Array<{ role: 'user' | 'assistant'; content: string }>;

/**
 * Build mode needs raw, prompt-controlled access to a provider — the shared
 * chat wrapper injects a chatty "keep it under 150 words" persona that ruins
 * code generation. This dispatches straight to the provider edge functions.
 */
export const callPlatformRaw = async (
  platform: AIPlatform,
  history: History,
  user: SupabaseUser,
): Promise<string> => {
  const model = platform.selectedModel || '';
  switch (platform.id) {
    case 'openai': return callOpenAI(history, user, model || undefined);
    case 'deepseek': return callDeepSeek(history, user, model || undefined);
    case 'grok': return callGrokAPI(history, user, model || undefined);
    case 'anthropic': return callClaudeAPI(history, model || undefined);
    case 'google': return callGeminiAPI(history, user, model || undefined);
    case 'mistral': return callMistralAPI(history, user, model || undefined);
    case 'perplexity': return callPerplexityAPI(history, user, model || undefined);
    case 'qwen': return callQwenAPI(history, user, model || undefined);
    case 'nvidia': return callNvidiaAPI(history, user, model);
    case 'local': return callLocalAPI(history, user, model);
    default: throw new Error(`${platform.name} can't build yet`);
  }
};
