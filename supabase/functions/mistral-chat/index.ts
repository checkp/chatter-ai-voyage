
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

    const { messages, model = 'mistral-medium-3.5', attachments } = await req.json();
    const user_id = user.id;

    // Splice image attachments into the last user message for vision-capable Mistral models
    if (Array.isArray(attachments) && attachments.length > 0 && /pixtral|vision|mistral-(medium|small|large)-[34]/i.test(model)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          const textPart = { type: 'text', text: messages[i].content };
          const imageParts = attachments
            .filter((a: any) => typeof a?.dataUrl === 'string' && a.dataUrl.startsWith('data:image/'))
            .slice(0, 4)
            .map((a: any) => ({ type: 'image_url', image_url: a.dataUrl }));
          messages[i] = { role: 'user', content: [textPart, ...imageParts] };
          break;
        }
      }
    }
    
    
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
      .select('api_cost_per_1k_tokens, tokens_per_message')
      .eq('platform', 'mistral')
      .eq('model_id', model)
      .maybeSingle();

    if (!pricingData) {
      console.warn('Invalid model requested:', model);
      return new Response(JSON.stringify({ error: 'Invalid model' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pre-call balance check
    const minTokens = pricingData?.tokens_per_message || 1;
    if (tokenData.balance < minTokens) {
      return new Response(JSON.stringify({ error: 'Insufficient tokens', required: minTokens, available: tokenData.balance }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const mistralApiKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralApiKey) throw new Error("Mistral API key not configured");

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mistralApiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const data_response = await response.json();
    const content = data_response.choices[0].message.content;

    const promptTokens = data_response.usage?.prompt_tokens || 0;
    const completionTokens = data_response.usage?.completion_tokens || 0;
    const totalTokens = data_response.usage?.total_tokens || promptTokens + completionTokens;

    const apiCostPer1kTokens = pricingData?.api_cost_per_1k_tokens || 0.002;
    const actualApiCost = (totalTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.max(1, Math.ceil((actualApiCost * 1.20) / 0.001));

    console.log(`Mistral usage: ${totalTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct}`);

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
    await supabaseClient
      .from('token_transactions')
      .insert({
        user_id,
        transaction_type: 'consumption',
        amount: -tokensToDeduct,
        balance_after: newBalance,
        description: `Mistral ${model} API call - ${totalTokens} tokens`,
        metadata: { platform: 'mistral', model, prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens, api_cost_dollars: actualApiCost, tokens_charged: tokensToDeduct, app_token_usd: 0.001, margin: 1.20 }
      });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Mistral function error:', error);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
