
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export const callOpenAI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'gpt-4o-mini'
): Promise<string> => {
  console.log('Calling OpenAI API...');
  
  const { data: apiKeyData, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('platform', 'openai')
    .single();

  if (error) {
    console.error('OpenAI API key error:', error);
    throw new Error('OpenAI API key not found. Please add your API key in settings.');
  }

  if (!apiKeyData?.encrypted_key) {
    throw new Error('OpenAI API key is empty. Please add your API key in settings.');
  }

  console.log('Making OpenAI request with key:', apiKeyData.encrypted_key.substring(0, 10) + '...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKeyData.encrypted_key}`
    },
    body: JSON.stringify({
      model: model,
      messages: conversationHistory,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API response error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const callDeepSeek = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'deepseek-chat'
): Promise<string> => {
  console.log('Calling DeepSeek API...');
  
  const { data: apiKeyData, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('platform', 'deepseek')
    .single();

  if (error) {
    console.error('DeepSeek API key error:', error);
    throw new Error('DeepSeek API key not found. Please add your API key in settings.');
  }

  if (!apiKeyData?.encrypted_key) {
    throw new Error('DeepSeek API key is empty. Please add your API key in settings.');
  }

  console.log('Making DeepSeek request with key:', apiKeyData.encrypted_key.substring(0, 10) + '...');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKeyData.encrypted_key}`
    },
    body: JSON.stringify({
      model: model,
      messages: conversationHistory,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek API response error:', response.status, errorText);
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const callGrokAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  user: SupabaseUser,
  model: string = 'grok-3'
): Promise<string> => {
  console.log('Calling Grok API...');
  
  const { data: apiKeyData, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('platform', 'grok')
    .single();

  if (error) {
    console.error('Grok API key error:', error);
    throw new Error('Grok API key not found. Please add your API key in settings.');
  }

  if (!apiKeyData?.encrypted_key) {
    throw new Error('Grok API key is empty. Please add your API key in settings.');
  }

  console.log('Making Grok request with key:', apiKeyData.encrypted_key.substring(0, 10) + '...');

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKeyData.encrypted_key}`
    },
    body: JSON.stringify({
      model: model,
      messages: conversationHistory,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Grok API response error:', response.status, errorText);
    throw new Error(`Grok API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const callClaudeAPI = async (
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
  model: string = 'claude-3-5-haiku-20241022'
): Promise<string> => {
  console.log('Calling Claude API via edge function...');
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log('Invoking claude-chat function...');

  const response = await supabase.functions.invoke('claude-chat', {
    body: { messages: conversationHistory, model: model },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  console.log('Claude function response:', response);

  if (response.error) {
    console.error('Claude function error:', response.error);
    throw new Error(response.error.message || 'Claude API call failed');
  }

  if (!response.data?.content) {
    console.error('Claude function missing content:', response.data);
    throw new Error('Claude API returned empty response');
  }

  return response.data.content;
};
