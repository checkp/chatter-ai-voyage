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

    const { messages, model = 'qwen-plus' } = await req.json();
    const user_id = user.id;

    let { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_tokens')
      .select('balance, total_consumed')
      .eq('user_id', user_id)
      .single();

    if (tokenError || !tokenData) {
      const { data: newTokenData, error: createError } = await supabaseClient
        .from('user_tokens')
        .insert({ user_id, balance: 300, total_purchased: 0, total_consumed: 0 })
        .select('balance, total_consumed')
        .single();
      if (createError) throw new Error('Unable to initialize token balance');
      tokenData = newTokenData;
    }

    const { data: pricingData } = await supabaseClient
      .from('model_pricing')
      .select('api_cost_per_1k_tokens')
      .eq('platform', 'qwen')
      .eq('model_id', model)
      .maybeSingle();

    if (!pricingData) {
      console.warn('Invalid Qwen model requested:', model);
      return new Response(JSON.stringify({ error: 'Invalid model' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get("DASHSCOPE_API_KEY");
    if (!apiKey) throw new Error("DashScope API key not configured");

    // DashScope OpenAI-compatible endpoint (international)
    const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen/DashScope API error: ${response.status} - ${errorText}`);
    }

    const data_response = await response.json();
    const content = data_response.choices?.[0]?.message?.content ?? '';

    const promptTokens = data_response.usage?.prompt_tokens || 0;
    const completionTokens = data_response.usage?.completion_tokens || 0;
    const totalTokens = data_response.usage?.total_tokens || promptTokens + completionTokens;

    const apiCostPer1kTokens = pricingData?.api_cost_per_1k_tokens || 0.002;
    const actualApiCost = (totalTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.max(1, Math.ceil(actualApiCost * 10));

    console.log(`Qwen usage: ${totalTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct}`);

    if (tokenData.balance < tokensToDeduct) throw new Error('Insufficient tokens');

    const newBalance = tokenData.balance - tokensToDeduct;

    await supabaseClient
      .from('user_tokens')
      .update({ balance: newBalance, total_consumed: (tokenData.total_consumed || 0) + tokensToDeduct })
      .eq('user_id', user_id);

    await supabaseClient
      .from('token_transactions')
      .insert({
        user_id,
        transaction_type: 'consumption',
        amount: -tokensToDeduct,
        balance_after: newBalance,
        description: `Qwen ${model} API call - ${totalTokens} tokens`,
        metadata: { platform: 'qwen', model, prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens, api_cost_dollars: actualApiCost },
      });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Qwen function error:', error);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
