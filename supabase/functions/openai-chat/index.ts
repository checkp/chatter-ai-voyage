
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.id) throw new Error("User not authenticated");

    const { messages, model = 'gpt-5.6-terra', attachments, capabilities = {} , max_output_tokens } = await req.json();
    const outBudget = Math.min(Math.max(Number(max_output_tokens) || 4096, 256), 32000);
    const user_id = user.id;

    // If the client sent image attachments and the model supports vision,
    // splice them into the LAST user message as OpenAI multimodal content blocks.
    const visionModels = /^(gpt-4o|gpt-4o-mini|gpt-4-turbo|gpt-5)/;
    if (Array.isArray(attachments) && attachments.length > 0 && visionModels.test(model)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          const textPart = { type: 'text', text: messages[i].content };
          const mediaParts = attachments
            .slice(0, 6)
            .map((a: any) => {
              if (typeof a?.dataUrl !== 'string') return null;
              if (a.dataUrl.startsWith('data:image/')) {
                return { type: 'image_url', image_url: { url: a.dataUrl } };
              }
              if (a.dataUrl.startsWith('data:application/pdf')) {
                return { type: 'file', file: { filename: a.name || 'document.pdf', file_data: a.dataUrl } };
              }
              return null;
            })
            .filter(Boolean);
          messages[i] = { role: 'user', content: [textPart, ...mediaParts] };
          break;
        }
      }
    }
    
    // Check token balance - create if doesn't exist
    let { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_tokens')
      .select('balance, total_consumed')
      .eq('user_id', user_id)
      .single();

    if (tokenError || !tokenData) {
      console.log('Creating initial token balance for user:', user_id);
      // Create initial token balance
      const { data: newTokenData, error: createError } = await supabaseClient
        .from('user_tokens')
        .insert({
          user_id: user_id,
          balance: 300,
          total_purchased: 0,
          total_consumed: 0
        })
        .select('balance, total_consumed')
        .single();

      if (createError) {
        console.error('Error creating token balance:', createError);
        throw new Error('Unable to initialize token balance');
      }
      
      tokenData = newTokenData;
    }

    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('model_pricing')
      .select('api_cost_per_1k_tokens, tokens_per_message')
      .eq('platform', 'openai')
      .eq('model_id', model)
      .maybeSingle();

    if (pricingError || !pricingData) {
      console.warn('Invalid model requested:', model);
      return new Response(JSON.stringify({ error: 'Invalid model' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pre-call balance check (prevents zero-balance users from triggering paid API calls)
    const minTokens = pricingData?.tokens_per_message || 1;
    if (tokenData.balance < minTokens) {
      return new Response(JSON.stringify({ error: 'Insufficient tokens', required: minTokens, available: tokenData.balance }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Build request body — apply advanced capabilities when supported.
    const reqBody: Record<string, unknown> = {
      model,
      messages,
      max_completion_tokens: outBudget,
    };
    const reasoningModels = /^(gpt-5|o1|o3|o4)/i;
    if (capabilities.think && reasoningModels.test(model)) {
      reqBody.reasoning_effort = 'high';
      console.log('[openai] enabling reasoning_effort=high');
    }
    const tools: any[] = [];
    if (capabilities.search || capabilities.deep_research) {
      tools.push({ type: 'web_search' });
      console.log('[openai] enabling web_search tool');
    }
    if (capabilities.code_exec) {
      tools.push({ type: 'code_interpreter' });
      console.log('[openai] enabling code_interpreter tool');
    }
    if (tools.length > 0) reqBody.tools = tools;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data_response = await response.json();
    const content = data_response.choices[0].message.content;

    // Calculate actual token cost based on usage
    const promptTokens = data_response.usage?.prompt_tokens || 0;
    const completionTokens = data_response.usage?.completion_tokens || 0;
    const totalTokens = data_response.usage?.total_tokens || promptTokens + completionTokens;

    // Calculate token cost - use default if no pricing data
    const apiCostPer1kTokens = pricingData?.api_cost_per_1k_tokens || 0.002; // Default OpenAI cost
    const actualApiCost = (totalTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.max(1, Math.ceil((actualApiCost * 1.20) / 0.001)); // Minimum 1 token

    console.log(`API usage: ${totalTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct} tokens`);

    const { data: deductData, error: deductErr } = await supabaseClient.rpc('deduct_user_tokens', {
      p_user_id: user_id,
      p_tokens: tokensToDeduct,
    });
    if (deductErr) throw new Error(`token deduction failed: ${deductErr.message}`);
    const deductRow = Array.isArray(deductData) ? deductData[0] : deductData;
    if (!deductRow) {
      return new Response(JSON.stringify({ error: 'Insufficient tokens', required: tokensToDeduct, available: tokenData.balance }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const newBalance = deductRow.new_balance;
    // Log transaction with detailed metadata
    await supabaseClient
      .from('token_transactions')
      .insert({
        user_id: user_id,
        transaction_type: 'consumption',
        amount: -tokensToDeduct,
        balance_after: newBalance,
        description: `OpenAI ${model} API call - ${totalTokens} tokens`,
        metadata: { 
          platform: 'openai', 
          model: model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          api_cost_dollars: actualApiCost, tokens_charged: tokensToDeduct, app_token_usd: 0.001, margin: 1.20,
          api_cost_per_1k_tokens: apiCostPer1kTokens
        }
      });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('OpenAI function error:', error);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
