
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Attachment } from '@/types/chat';
import type { Capabilities } from '@/lib/capabilities';

const getValidSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Session expired — please refresh the page');
  }
  return session;
};

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isNetworkError = lastError.message.includes('Load failed') ||
        lastError.message.includes('TypeError') ||
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('NetworkError');

      if (!isNetworkError || attempt === maxRetries) {
        throw lastError;
      }
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error('Request failed after retries');
};

const friendlyError = (error: unknown, platformName: string): Error => {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('Load failed') || msg.includes('Failed to fetch') || msg.includes('TypeError') || msg.includes('NetworkError')) {
    return new Error(`Network error calling ${platformName} — please try again`);
  }
  if (msg.includes('Session expired') || msg.includes('Not authenticated')) {
    return new Error('Session expired — please refresh the page');
  }
  return error instanceof Error ? error : new Error(msg);
};

type History = Array<{ role: 'user' | 'assistant'; content: string }>;

const buildBody = (
  messages: History,
  model: string,
  userId: string | undefined,
  attachments?: Attachment[],
  capabilities?: Capabilities,
) => {
  const body: Record<string, unknown> = { messages, model };
  if (userId) body.user_id = userId;
  if (attachments && attachments.length > 0) body.attachments = attachments;
  if (capabilities && Object.values(capabilities).some(Boolean)) body.capabilities = capabilities;
  return body;
};

export const callOpenAI = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string = 'gpt-4o-mini',
  attachments?: Attachment[],
  capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('openai-chat', {
      body: buildBody(conversationHistory, model, user.id, attachments, capabilities),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'OpenAI API call failed');
    if (!response.data?.content) throw new Error('OpenAI API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'OpenAI'); });
};

export const callDeepSeek = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string = 'deepseek-chat',
  _attachments?: Attachment[],
  capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('deepseek-chat', {
      body: buildBody(conversationHistory, model, user.id, undefined, capabilities),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'DeepSeek API call failed');
    if (!response.data?.content) throw new Error('DeepSeek API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'DeepSeek'); });
};

export const callGrokAPI = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string = 'grok-3',
  attachments?: Attachment[],
  capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('grok-chat', {
      body: buildBody(conversationHistory, model, user.id, attachments, capabilities),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Grok API call failed');
    if (!response.data?.content) throw new Error('Grok API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Grok'); });
};

export const callClaudeAPI = async (
  conversationHistory: History,
  model: string = 'claude-3-5-haiku-20241022',
  attachments?: Attachment[],
  capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('claude-chat', {
      body: buildBody(conversationHistory, model, undefined, attachments, capabilities),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Claude API call failed');
    if (!response.data?.content) throw new Error('Claude API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Claude'); });
};

export const callGeminiAPI = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string = 'gemini-2.5-flash',
  attachments?: Attachment[],
  capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('gemini-chat', {
      body: buildBody(conversationHistory, model, user.id, attachments, capabilities),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Gemini API call failed');
    if (!response.data?.content) throw new Error('Gemini API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Gemini'); });
};

export const callMistralAPI = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string = 'mistral-large-latest',
  attachments?: Attachment[],
  _capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('mistral-chat', {
      body: buildBody(conversationHistory, model, user.id, attachments),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Mistral API call failed');
    if (!response.data?.content) throw new Error('Mistral API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Mistral'); });
};

export const callPerplexityAPI = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string = 'sonar-pro',
  _attachments?: Attachment[],
  capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('perplexity-chat', {
      body: buildBody(conversationHistory, model, user.id, undefined, capabilities),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Perplexity API call failed');
    if (!response.data?.content) throw new Error('Perplexity API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Perplexity'); });
};

export const callQwenAPI = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string = 'qwen-plus',
  _attachments?: Attachment[],
  _capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('qwen-chat', {
      body: buildBody(conversationHistory, model, user.id),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Qwen API call failed');
    if (!response.data?.content) throw new Error('Qwen API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Qwen'); });
};

// ── Local models (LM Studio / Ollama via the local-chat edge function) ────────

export interface LocalProvider {
  id: string;      // 'lmstudio' | 'ollama'
  name: string;    // display name
  models: string[];
}

export const fetchLocalModels = async (): Promise<LocalProvider[]> => {
  const session = await getValidSession();
  const response = await supabase.functions.invoke('local-chat', {
    body: { action: 'models' },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (response.error) throw new Error(response.error.message || 'Failed to list local models');
  return response.data?.providers ?? [];
};

export const callLocalAPI = async (
  conversationHistory: History,
  user: SupabaseUser,
  // "<provider>::<model-id>", as stored in the local platform's selectedModel
  model: string = '',
  _attachments?: Attachment[],
  _capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('local-chat', {
      body: buildBody(conversationHistory, model, user.id),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Local model call failed');
    if (!response.data?.content) throw new Error('Local model returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Local'); });
};
