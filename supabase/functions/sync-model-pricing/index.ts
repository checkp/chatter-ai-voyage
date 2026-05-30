// Supabase Edge Function: sync-model-pricing
// Purpose: Sync/seed pricing for supported AI models into public.model_pricing
// Requirements: Admin-only via JWT; uses service role for DB ops; respects CORS

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pricing map: api_cost_per_1k_tokens is an effective blended price (avg input/output) in USD
// tokens_per_message is our internal app token estimate per single message for pre-checks
const PRICING_MAP: Array<{
  platform: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'grok' | 'mistral' | 'perplexity';
  model_id: string;
  cost_tier: 'low' | 'medium' | 'high';
  api_cost_per_1k_tokens: number; // USD (blended avg of input/output)
  tokens_per_message: number;     // internal app tokens per msg
}> = [
  // OpenAI
  { platform: 'openai', model_id: 'gpt-4o-mini',  cost_tier: 'low',  api_cost_per_1k_tokens: 0.000375, tokens_per_message: 5 },
  { platform: 'openai', model_id: 'gpt-4o',       cost_tier: 'high', api_cost_per_1k_tokens: 0.00625,  tokens_per_message: 20 },
  { platform: 'openai', model_id: 'gpt-4-turbo',  cost_tier: 'high', api_cost_per_1k_tokens: 0.020,    tokens_per_message: 20 },
  { platform: 'openai', model_id: 'gpt-5',        cost_tier: 'high', api_cost_per_1k_tokens: 0.0075,   tokens_per_message: 22 },

  // Anthropic — Claude 4 family
  { platform: 'anthropic', model_id: 'claude-haiku-4-20250514',  cost_tier: 'low',    api_cost_per_1k_tokens: 0.0025, tokens_per_message: 6 },
  { platform: 'anthropic', model_id: 'claude-sonnet-4-20250514', cost_tier: 'medium', api_cost_per_1k_tokens: 0.009,  tokens_per_message: 12 },
  { platform: 'anthropic', model_id: 'claude-opus-4-20250514',   cost_tier: 'high',   api_cost_per_1k_tokens: 0.045,  tokens_per_message: 24 },

  // Google Gemini 2.5
  { platform: 'google', model_id: 'gemini-2.5-flash', cost_tier: 'low',  api_cost_per_1k_tokens: 0.0008, tokens_per_message: 5 },
  { platform: 'google', model_id: 'gemini-2.5-pro',   cost_tier: 'high', api_cost_per_1k_tokens: 0.008,  tokens_per_message: 14 },

  // DeepSeek
  { platform: 'deepseek', model_id: 'deepseek-chat',  cost_tier: 'low', api_cost_per_1k_tokens: 0.00028, tokens_per_message: 5 },
  { platform: 'deepseek', model_id: 'deepseek-coder', cost_tier: 'low', api_cost_per_1k_tokens: 0.00028, tokens_per_message: 6 },

  // xAI Grok
  { platform: 'grok', model_id: 'grok-4',             cost_tier: 'high',   api_cost_per_1k_tokens: 0.010, tokens_per_message: 18 },
  { platform: 'grok', model_id: 'grok-4-heavy',       cost_tier: 'high',   api_cost_per_1k_tokens: 0.015, tokens_per_message: 24 },
  { platform: 'grok', model_id: 'grok-3',             cost_tier: 'high',   api_cost_per_1k_tokens: 0.010, tokens_per_message: 16 },
  { platform: 'grok', model_id: 'grok-3-mini',        cost_tier: 'medium', api_cost_per_1k_tokens: 0.006, tokens_per_message: 10 },
  { platform: 'grok', model_id: 'grok-3-fast',        cost_tier: 'low',    api_cost_per_1k_tokens: 0.004, tokens_per_message: 8 },
  { platform: 'grok', model_id: 'grok-3-mini-fast',   cost_tier: 'low',    api_cost_per_1k_tokens: 0.003, tokens_per_message: 6 },
  { platform: 'grok', model_id: 'grok-2-vision-1212', cost_tier: 'medium', api_cost_per_1k_tokens: 0.007, tokens_per_message: 12 },
  { platform: 'grok', model_id: 'grok-2-1212',        cost_tier: 'medium', api_cost_per_1k_tokens: 0.006, tokens_per_message: 10 },

  // Mistral AI
  { platform: 'mistral', model_id: 'mistral-large-latest',  cost_tier: 'high',   api_cost_per_1k_tokens: 0.006, tokens_per_message: 16 },
  { platform: 'mistral', model_id: 'mistral-medium-latest', cost_tier: 'medium', api_cost_per_1k_tokens: 0.0027, tokens_per_message: 10 },
  { platform: 'mistral', model_id: 'mistral-small-latest',  cost_tier: 'low',    api_cost_per_1k_tokens: 0.0006, tokens_per_message: 6 },
  { platform: 'mistral', model_id: 'codestral-latest',      cost_tier: 'medium', api_cost_per_1k_tokens: 0.0009, tokens_per_message: 8 },

  // Perplexity AI
  { platform: 'perplexity', model_id: 'sonar',               cost_tier: 'low',  api_cost_per_1k_tokens: 0.001, tokens_per_message: 6 },
  { platform: 'perplexity', model_id: 'sonar-pro',           cost_tier: 'high', api_cost_per_1k_tokens: 0.009, tokens_per_message: 14 },
  { platform: 'perplexity', model_id: 'sonar-reasoning-pro', cost_tier: 'high', api_cost_per_1k_tokens: 0.012, tokens_per_message: 18 },
];

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Admin check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error', profileError);
      return new Response(JSON.stringify({ error: 'Failed to verify admin' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admins only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Sync pricing entries
    const results: Array<{ platform: string; model_id: string; action: 'created' | 'updated' }> = [];

    for (const row of PRICING_MAP) {
      const { data: existing, error: readErr } = await supabase
        .from('model_pricing')
        .select('id')
        .eq('platform', row.platform)
        .eq('model_id', row.model_id)
        .maybeSingle();

      if (readErr) {
        console.error('Read error for', row.platform, row.model_id, readErr);
        continue;
      }

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from('model_pricing')
          .update({
            cost_tier: row.cost_tier,
            tokens_per_message: row.tokens_per_message,
            api_cost_per_1k_tokens: row.api_cost_per_1k_tokens,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updErr) {
          console.error('Update error for', row.platform, row.model_id, updErr);
        } else {
          results.push({ platform: row.platform, model_id: row.model_id, action: 'updated' });
        }
      } else {
        const { error: insErr } = await supabase.from('model_pricing').insert({
          platform: row.platform,
          model_id: row.model_id,
          cost_tier: row.cost_tier,
          tokens_per_message: row.tokens_per_message,
          api_cost_per_1k_tokens: row.api_cost_per_1k_tokens,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insErr) {
          console.error('Insert error for', row.platform, row.model_id, insErr);
        } else {
          results.push({ platform: row.platform, model_id: row.model_id, action: 'created' });
        }
      }
    }

    const summary = {
      processed: PRICING_MAP.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      results,
    };

    console.log('sync-model-pricing summary', summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('sync-model-pricing fatal', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
