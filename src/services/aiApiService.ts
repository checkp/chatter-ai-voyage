
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

export const callOpenAI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'gpt-4o-mini'
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('openai-chat', {
      body: { messages: conversationHistory, model, user_id: user.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'OpenAI API call failed');
    if (!response.data?.content) throw new Error('OpenAI API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'OpenAI'); });
};

export const callDeepSeek = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'deepseek-chat'
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('deepseek-chat', {
      body: { messages: conversationHistory, model, user_id: user.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'DeepSeek API call failed');
    if (!response.data?.content) throw new Error('DeepSeek API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'DeepSeek'); });
};

export const callGrokAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'grok-3'
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('grok-chat', {
      body: { messages: conversationHistory, model, user_id: user.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Grok API call failed');
    if (!response.data?.content) throw new Error('Grok API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Grok'); });
};

export const callClaudeAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  model: string = 'claude-3-5-haiku-20241022'
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('claude-chat', {
      body: { messages: conversationHistory, model },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Claude API call failed');
    if (!response.data?.content) throw new Error('Claude API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Claude'); });
};

export const callGeminiAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'gemini-2.5-flash'
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('gemini-chat', {
      body: { messages: conversationHistory, model, user_id: user.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Gemini API call failed');
    if (!response.data?.content) throw new Error('Gemini API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Gemini'); });
};

export const callMistralAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'mistral-large-latest'
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('mistral-chat', {
      body: { messages: conversationHistory, model, user_id: user.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Mistral API call failed');
    if (!response.data?.content) throw new Error('Mistral API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Mistral'); });
};

export const callPerplexityAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'sonar-pro'
): Promise<string> => {
  return withRetry(async () => {
    const session = await getValidSession();
    const response = await supabase.functions.invoke('perplexity-chat', {
      body: { messages: conversationHistory, model, user_id: user.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.error) throw new Error(response.error.message || 'Perplexity API call failed');
    if (!response.data?.content) throw new Error('Perplexity API returned empty response');
    return response.data.content;
  }).catch(e => { throw friendlyError(e, 'Perplexity'); });
};
