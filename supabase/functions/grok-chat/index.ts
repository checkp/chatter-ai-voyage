
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

    // SECURITY FIX: Extract user_id from authenticated session, not from request body
    const { messages, model } = await req.json();
    const user_id = user.id;
    
    // Check token balance
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_tokens')
      .select('balance, total_consumed')
      .eq('user_id', user_id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Unable to fetch token balance');
    }

    // Get pricing data for this model
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('model_pricing')
      .select('api_cost_per_1k_tokens')
      .eq('platform', 'grok')
      .eq('model_id', model)
      .single();

    if (pricingError || !pricingData) {
      throw new Error('Pricing data not found for this model');
    }

    const grokApiKey = Deno.env.get("GROK_API_KEY");
    if (!grokApiKey) {
      throw new Error("Grok API key not configured");
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data_response = await response.json();
    const content = data_response.choices[0].message.content;

    // Calculate actual token cost based on usage
    const promptTokens = data_response.usage?.prompt_tokens || 0;
    const completionTokens = data_response.usage?.completion_tokens || 0;
    const totalTokens = data_response.usage?.total_tokens || promptTokens + completionTokens;

    // FIXED: Much more reasonable token calculation
    // Our tokens are worth approximately $0.001 each (1/10th of a cent)
    const apiCostPer1kTokens = pricingData.api_cost_per_1k_tokens;
    const actualApiCost = (totalTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.ceil(actualApiCost / 0.001); // Changed from 0.01 to 0.001

    if (tokenData.balance < tokensToDeduct) {
      throw new Error('Insufficient tokens for this request');
    }

    // Deduct tokens after successful response
    const newBalance = tokenData.balance - tokensToDeduct;
    
    await supabaseClient
      .from('user_tokens')
      .update({ 
        balance: newBalance,
        total_consumed: (tokenData.total_consumed || 0) + tokensToDeduct
      })
      .eq('user_id', user_id);

    // Log transaction with detailed metadata (without sensitive info)
    await supabaseClient
      .from('token_transactions')
      .insert({
        user_id: user_id,
        transaction_type: 'consumption',
        amount: -tokensToDeduct,
        balance_after: newBalance,
        description: `Grok ${model} API call - ${totalTokens} tokens`,
        metadata: { 
          platform: 'grok', 
          model: model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          api_cost_dollars: actualApiCost,
          api_cost_per_1k_tokens: apiCostPer1kTokens
        }
      });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // SECURITY FIX: Don't expose internal error details
    console.error('Grok function error:', error);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
