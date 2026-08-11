
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
  model: string = 'gpt-5.6-terra',
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
  model: string = 'claude-sonnet-5',
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
  model: string = 'gemini-3.6-flash',
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
  model: string = 'mistral-medium-3.5',
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
  model: string = 'qwen3.6-plus',
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

export const callNvidiaAPI = async (
  conversationHistory: History,
  user: SupabaseUser,
  model: string,
  attachments?: Attachment[],
  _capabilities?: Capabilities,
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('nvidia-chat', {
      body: buildBody(conversationHistory, model, user.id, attachments),
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'NVIDIA API call failed');
    if (!response.data?.content) throw new Error('NVIDIA API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'NVIDIA'); });
};

// ── Local models (LM Studio / Ollama) ────────────────────────────────────────
// Called **directly from the browser** — the hosted edge function can't reach
// the user's `localhost`. LM Studio and Ollama both send permissive CORS.

export interface LocalProvider {
  id: string;      // 'lmstudio' | 'ollama'
  name: string;    // display name
  baseUrl: string; // OpenAI-compatible base, e.g. http://localhost:1234/v1
  models: string[];
}

const LOCAL_PROVIDERS: Array<{ id: string; name: string; baseUrl: string }> = [
  { id: 'lmstudio', name: 'LM Studio', baseUrl: 'http://localhost:1234/v1' },
  { id: 'ollama',   name: 'Ollama',    baseUrl: 'http://localhost:11434/v1' },
];

const probeProvider = async (
  p: { id: string; name: string; baseUrl: string },
): Promise<LocalProvider | null> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${p.baseUrl}/models`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    const models: string[] = (j.data ?? j.models ?? [])
      .map((m: any) => m.id ?? m.name ?? m.model)
      .filter((id: unknown): id is string => typeof id === 'string' && !/embed/i.test(id));
    return models.length ? { ...p, models } : null;
  } catch {
    return null;
  }
};

export const fetchLocalModels = async (): Promise<LocalProvider[]> => {
  const results = await Promise.all(LOCAL_PROVIDERS.map(probeProvider));
  return results.filter((p): p is LocalProvider => p !== null);
};

export const callLocalAPI = async (
  conversationHistory: History,
  _user: SupabaseUser,
  // "<provider>::<model-id>", as stored in the local platform's selectedModel
  model: string = '',
  _attachments?: Attachment[],
  _capabilities?: Capabilities,
): Promise<string> => {
  const sep = model.indexOf('::');
  const providerId = sep > 0 ? model.slice(0, sep) : 'lmstudio';
  const modelId = sep > 0 ? model.slice(sep + 2) : model;
  const provider = LOCAL_PROVIDERS.find(p => p.id === providerId);
  if (!provider) throw new Error(`Unknown local provider: ${providerId}`);

  return withRetry(async () => {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages: conversationHistory, max_tokens: 4096 }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${provider.name} error ${res.status}: ${text || res.statusText}`);
    }
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${provider.name} returned an empty response`);
    return content;
  }).catch(e => { throw friendlyError(e, provider.name); });
};
