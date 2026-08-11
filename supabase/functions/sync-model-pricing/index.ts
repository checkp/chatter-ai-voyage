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
  platform: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'grok' | 'mistral' | 'perplexity' | 'qwen' | 'nvidia';
  model_id: string;
  cost_tier: 'low' | 'medium' | 'high';
  api_cost_per_1k_tokens: number; // USD (blended avg of input/output)
  tokens_per_message: number;     // internal app tokens per msg
}> = [
  // OpenAI — GPT-5.6 family current; GPT-5 / GPT-4o legacy
  { platform: 'openai', model_id: 'gpt-5.6-sol',   cost_tier: 'high',   api_cost_per_1k_tokens: 0.0175,  tokens_per_message: 22 },
  { platform: 'openai', model_id: 'gpt-5.6-terra', cost_tier: 'medium', api_cost_per_1k_tokens: 0.004,   tokens_per_message: 10 },
  { platform: 'openai', model_id: 'gpt-5.6-luna',  cost_tier: 'low',    api_cost_per_1k_tokens: 0.0008,  tokens_per_message: 5 },
  { platform: 'openai', model_id: 'o3-deep-research', cost_tier: 'high', api_cost_per_1k_tokens: 0.030,  tokens_per_message: 30 },
  { platform: 'openai', model_id: 'gpt-4o-mini',  cost_tier: 'low',  api_cost_per_1k_tokens: 0.000375, tokens_per_message: 5 },
  { platform: 'openai', model_id: 'gpt-4o',       cost_tier: 'high', api_cost_per_1k_tokens: 0.00625,  tokens_per_message: 20 },
  { platform: 'openai', model_id: 'gpt-5',        cost_tier: 'high', api_cost_per_1k_tokens: 0.0075,   tokens_per_message: 22 },

  // Anthropic — Claude 5 family current; Haiku 4.5 still active
  { platform: 'anthropic', model_id: 'claude-fable-5',  cost_tier: 'high',   api_cost_per_1k_tokens: 0.030, tokens_per_message: 28 },
  { platform: 'anthropic', model_id: 'claude-opus-5',   cost_tier: 'high',   api_cost_per_1k_tokens: 0.015, tokens_per_message: 20 },
  { platform: 'anthropic', model_id: 'claude-sonnet-5', cost_tier: 'medium', api_cost_per_1k_tokens: 0.009, tokens_per_message: 12 },
  { platform: 'anthropic', model_id: 'claude-haiku-4-5', cost_tier: 'low',   api_cost_per_1k_tokens: 0.003, tokens_per_message: 6 },

  // Google Gemini 3.x
  { platform: 'google', model_id: 'gemini-3.6-flash',      cost_tier: 'medium', api_cost_per_1k_tokens: 0.0015, tokens_per_message: 7 },
  { platform: 'google', model_id: 'gemini-3.5-flash',      cost_tier: 'medium', api_cost_per_1k_tokens: 0.002,  tokens_per_message: 8 },
  { platform: 'google', model_id: 'gemini-3.5-flash-lite', cost_tier: 'low',    api_cost_per_1k_tokens: 0.0005, tokens_per_message: 4 },
  { platform: 'google', model_id: 'gemini-3.1-flash-lite', cost_tier: 'low',    api_cost_per_1k_tokens: 0.0004, tokens_per_message: 4 },
  { platform: 'google', model_id: 'gemini-2.5-flash', cost_tier: 'low',  api_cost_per_1k_tokens: 0.0008, tokens_per_message: 5 },
  { platform: 'google', model_id: 'gemini-2.5-pro',   cost_tier: 'high', api_cost_per_1k_tokens: 0.008,  tokens_per_message: 14 },

  // DeepSeek — ids route to DeepSeek V4
  { platform: 'deepseek', model_id: 'deepseek-chat',     cost_tier: 'low',    api_cost_per_1k_tokens: 0.00028, tokens_per_message: 5 },
  { platform: 'deepseek', model_id: 'deepseek-reasoner', cost_tier: 'medium', api_cost_per_1k_tokens: 0.00065, tokens_per_message: 3 },
  { platform: 'deepseek', model_id: 'deepseek-v4-pro',   cost_tier: 'medium', api_cost_per_1k_tokens: 0.0012,  tokens_per_message: 8 },
  { platform: 'deepseek', model_id: 'deepseek-coder',    cost_tier: 'low',    api_cost_per_1k_tokens: 0.00028, tokens_per_message: 6 },

  // xAI Grok 4.x
  { platform: 'grok', model_id: 'grok-4.5',                 cost_tier: 'high',   api_cost_per_1k_tokens: 0.004,  tokens_per_message: 18 },
  { platform: 'grok', model_id: 'grok-4.3',                 cost_tier: 'medium', api_cost_per_1k_tokens: 0.0019, tokens_per_message: 10 },
  { platform: 'grok', model_id: 'grok-4.20-0309-reasoning', cost_tier: 'medium', api_cost_per_1k_tokens: 0.0025, tokens_per_message: 12 },
  { platform: 'grok', model_id: 'grok-code-fast-1',         cost_tier: 'low',    api_cost_per_1k_tokens: 0.0008, tokens_per_message: 5 },
  { platform: 'grok', model_id: 'grok-4',                   cost_tier: 'high',   api_cost_per_1k_tokens: 0.010,  tokens_per_message: 18 },
  { platform: 'grok', model_id: 'grok-3',                   cost_tier: 'high',   api_cost_per_1k_tokens: 0.010,  tokens_per_message: 16 },
  { platform: 'grok', model_id: 'grok-3-mini',              cost_tier: 'medium', api_cost_per_1k_tokens: 0.006,  tokens_per_message: 10 },

  // Mistral AI
  { platform: 'mistral', model_id: 'mistral-medium-3.5', cost_tier: 'medium', api_cost_per_1k_tokens: 0.0027, tokens_per_message: 10 },
  { platform: 'mistral', model_id: 'mistral-small-4',    cost_tier: 'low',    api_cost_per_1k_tokens: 0.0006, tokens_per_message: 5 },
  { platform: 'mistral', model_id: 'mistral-large-3',    cost_tier: 'medium', api_cost_per_1k_tokens: 0.004,  tokens_per_message: 12 },
  { platform: 'mistral', model_id: 'codestral-latest',   cost_tier: 'medium', api_cost_per_1k_tokens: 0.0009, tokens_per_message: 8 },

  // Perplexity Sonar
  { platform: 'perplexity', model_id: 'sonar',               cost_tier: 'low',    api_cost_per_1k_tokens: 0.001, tokens_per_message: 5 },
  { platform: 'perplexity', model_id: 'sonar-pro',           cost_tier: 'medium', api_cost_per_1k_tokens: 0.009, tokens_per_message: 10 },
  { platform: 'perplexity', model_id: 'sonar-reasoning-pro', cost_tier: 'high',   api_cost_per_1k_tokens: 0.012, tokens_per_message: 16 },
  { platform: 'perplexity', model_id: 'sonar-deep-research', cost_tier: 'high',   api_cost_per_1k_tokens: 0.025, tokens_per_message: 30 },

  // Qwen (Alibaba DashScope)
  { platform: 'qwen', model_id: 'qwen3.8-max',   cost_tier: 'high',   api_cost_per_1k_tokens: 0.010,  tokens_per_message: 16 },
  { platform: 'qwen', model_id: 'qwen3.6-plus',  cost_tier: 'medium', api_cost_per_1k_tokens: 0.002,  tokens_per_message: 8 },
  { platform: 'qwen', model_id: 'qwen3-vl-plus', cost_tier: 'medium', api_cost_per_1k_tokens: 0.0025, tokens_per_message: 9 },
  { platform: 'qwen', model_id: 'qwen-turbo',    cost_tier: 'low',    api_cost_per_1k_tokens: 0.0006, tokens_per_message: 4 },


  // NVIDIA-hosted NIMs (integrate.api.nvidia.com) — OpenAI-compatible.
  { platform: 'nvidia', model_id: 'nvidia/nemotron-3-ultra-550b-a55b',              cost_tier: 'high',   api_cost_per_1k_tokens: 0.020,  tokens_per_message: 26 },
  { platform: 'nvidia', model_id: 'nvidia/nemotron-3-super-120b-a12b',              cost_tier: 'high',   api_cost_per_1k_tokens: 0.008,  tokens_per_message: 16 },
  { platform: 'nvidia', model_id: 'nvidia/nemotron-3-nano-30b-a3b',                 cost_tier: 'low',    api_cost_per_1k_tokens: 0.0005, tokens_per_message: 5 },
  { platform: 'nvidia', model_id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',        cost_tier: 'high',   api_cost_per_1k_tokens: 0.010,  tokens_per_message: 20 },
  { platform: 'nvidia', model_id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',       cost_tier: 'medium', api_cost_per_1k_tokens: 0.003,  tokens_per_message: 10 },
  { platform: 'nvidia', model_id: 'deepseek-ai/deepseek-v4-pro',                    cost_tier: 'high',   api_cost_per_1k_tokens: 0.008,  tokens_per_message: 18 },
  { platform: 'nvidia', model_id: 'deepseek-ai/deepseek-v4-flash',                  cost_tier: 'low',    api_cost_per_1k_tokens: 0.0008, tokens_per_message: 6 },
  { platform: 'nvidia', model_id: 'mistralai/mistral-large-3-675b-instruct-2512',   cost_tier: 'high',   api_cost_per_1k_tokens: 0.012,  tokens_per_message: 24 },
  { platform: 'nvidia', model_id: 'mistralai/mistral-nemotron',                     cost_tier: 'medium', api_cost_per_1k_tokens: 0.004,  tokens_per_message: 12 },
  { platform: 'nvidia', model_id: 'mistralai/mistral-medium-3.5-128b',              cost_tier: 'medium', api_cost_per_1k_tokens: 0.003,  tokens_per_message: 10 },
  { platform: 'nvidia', model_id: 'qwen/qwen3.5-397b-a17b',                         cost_tier: 'high',   api_cost_per_1k_tokens: 0.010,  tokens_per_message: 20 },
  { platform: 'nvidia', model_id: 'qwen/qwen3.5-122b-a10b',                         cost_tier: 'medium', api_cost_per_1k_tokens: 0.004,  tokens_per_message: 12 },
  { platform: 'nvidia', model_id: 'qwen/qwen3-next-80b-a3b-instruct',               cost_tier: 'medium', api_cost_per_1k_tokens: 0.002,  tokens_per_message: 8 },
  { platform: 'nvidia', model_id: 'moonshotai/kimi-k2.6',                           cost_tier: 'high',   api_cost_per_1k_tokens: 0.008,  tokens_per_message: 18 },
  { platform: 'nvidia', model_id: 'z-ai/glm-5.2',                                   cost_tier: 'high',   api_cost_per_1k_tokens: 0.007,  tokens_per_message: 16 },
  { platform: 'nvidia', model_id: 'minimaxai/minimax-m3',                           cost_tier: 'medium', api_cost_per_1k_tokens: 0.004,  tokens_per_message: 12 },
  { platform: 'nvidia', model_id: 'openai/gpt-oss-120b',                            cost_tier: 'medium', api_cost_per_1k_tokens: 0.003,  tokens_per_message: 12 },
  { platform: 'nvidia', model_id: 'openai/gpt-oss-20b',                             cost_tier: 'low',    api_cost_per_1k_tokens: 0.0008, tokens_per_message: 5 },
  { platform: 'nvidia', model_id: 'meta/llama-4-maverick-17b-128e-instruct',        cost_tier: 'medium', api_cost_per_1k_tokens: 0.003,  tokens_per_message: 10 },
  { platform: 'nvidia', model_id: 'meta/llama-3.3-70b-instruct',                    cost_tier: 'medium', api_cost_per_1k_tokens: 0.002,  tokens_per_message: 8 },
  { platform: 'nvidia', model_id: 'nvidia/nemotron-nano-12b-v2-vl',                 cost_tier: 'low',    api_cost_per_1k_tokens: 0.0008, tokens_per_message: 6 },
  { platform: 'nvidia', model_id: 'nvidia/cosmos-reason2-8b',                       cost_tier: 'low',    api_cost_per_1k_tokens: 0.0006, tokens_per_message: 5 },
  { platform: 'nvidia', model_id: 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1',        cost_tier: 'low',    api_cost_per_1k_tokens: 0.0006, tokens_per_message: 5 },
  { platform: 'nvidia', model_id: 'meta/llama-3.2-90b-vision-instruct',             cost_tier: 'high',   api_cost_per_1k_tokens: 0.006,  tokens_per_message: 14 },
  { platform: 'nvidia', model_id: 'meta/llama-3.2-11b-vision-instruct',             cost_tier: 'low',    api_cost_per_1k_tokens: 0.0008, tokens_per_message: 6 },
  { platform: 'nvidia', model_id: 'microsoft/phi-3-vision-128k-instruct',            cost_tier: 'low',    api_cost_per_1k_tokens: 0.0007, tokens_per_message: 5 },
  { platform: 'nvidia', model_id: 'mistralai/codestral-22b-instruct-v0.1',          cost_tier: 'low',    api_cost_per_1k_tokens: 0.0009, tokens_per_message: 6 },
  { platform: 'nvidia', model_id: 'writer/palmyra-med-70b-32k',                     cost_tier: 'medium', api_cost_per_1k_tokens: 0.005,  tokens_per_message: 12 },
  { platform: 'nvidia', model_id: 'writer/palmyra-fin-70b-32k',                     cost_tier: 'medium', api_cost_per_1k_tokens: 0.005,  tokens_per_message: 12 },
  { platform: 'nvidia', model_id: 'writer/palmyra-creative-122b',                   cost_tier: 'medium', api_cost_per_1k_tokens: 0.006,  tokens_per_message: 14 },
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
