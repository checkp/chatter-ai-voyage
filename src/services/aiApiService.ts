
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export const callOpenAI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'gpt-4o-mini'
): Promise<string> => {
  console.log('Calling OpenAI API with centralized key...');
  
  const response = await supabase.functions.invoke('openai-chat', {
    body: { 
      messages: conversationHistory, 
      model: model,
      user_id: user.id 
    },
    headers: {
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
  });

  if (response.error) {
    console.error('OpenAI function error:', response.error);
    throw new Error(response.error.message || 'OpenAI API call failed');
  }

  if (!response.data?.content) {
    console.error('OpenAI function missing content:', response.data);
    throw new Error('OpenAI API returned empty response');
  }

  return response.data.content;
};

export const callDeepSeek = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'deepseek-chat'
): Promise<string> => {
  console.log('Calling DeepSeek API with centralized key...');
  
  const response = await supabase.functions.invoke('deepseek-chat', {
    body: { 
      messages: conversationHistory, 
      model: model,
      user_id: user.id 
    },
    headers: {
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
  });

  if (response.error) {
    console.error('DeepSeek function error:', response.error);
    throw new Error(response.error.message || 'DeepSeek API call failed');
  }

  if (!response.data?.content) {
    console.error('DeepSeek function missing content:', response.data);
    throw new Error('DeepSeek API returned empty response');
  }

  return response.data.content;
};

export const callGrokAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'grok-3'
): Promise<string> => {
  console.log('Calling Grok API with centralized key...');
  
  const response = await supabase.functions.invoke('grok-chat', {
    body: { 
      messages: conversationHistory, 
      model: model,
      user_id: user.id 
    },
    headers: {
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
  });

  if (response.error) {
    console.error('Grok function error:', response.error);
    throw new Error(response.error.message || 'Grok API call failed');
  }

  if (!response.data?.content) {
    console.error('Grok function missing content:', response.data);
    throw new Error('Grok API returned empty response');
  }

  return response.data.content;
};

export const callClaudeAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  model: string = 'claude-3-5-haiku-20241022'
): Promise<string> => {
  console.log('Calling Claude API with centralized key...');
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Invoking claude-chat function with centralized key (attempt ${attempt}/${maxRetries})...`);

      const response = await supabase.functions.invoke('claude-chat', {
        body: { messages: conversationHistory, model: model },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Claude function response:', response);

      if (response.error) {
        console.error(`Claude function error (attempt ${attempt}):`, response.error);
        lastError = new Error(response.error.message || 'Claude API call failed');
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw lastError;
      }

      if (!response.data?.content) {
        console.error(`Claude function missing content (attempt ${attempt}):`, response.data);
        lastError = new Error('Claude API returned empty response');
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw lastError;
      }

      console.log(`Claude API call successful on attempt ${attempt} using centralized key`);
      return response.data.content;

    } catch (error) {
      console.error(`Claude API error (attempt ${attempt}):`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Claude API call failed after all retries');
};

export const callGeminiAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'gemini-2.5-flash'
): Promise<string> => {
  console.log('Calling Gemini API with centralized key...');
  
  const response = await supabase.functions.invoke('gemini-chat', {
    body: { 
      messages: conversationHistory, 
      model: model,
      user_id: user.id 
    },
    headers: {
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
  });

  if (response.error) {
    console.error('Gemini function error:', response.error);
    throw new Error(response.error.message || 'Gemini API call failed');
  }

  if (!response.data?.content) {
    console.error('Gemini function missing content:', response.data);
    throw new Error('Gemini API returned empty response');
  }

  return response.data.content;
};
