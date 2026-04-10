
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

    const { messages, model = 'gpt-4o-mini' } = await req.json();
    const user_id = user.id;
    
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

    // Get pricing data for this model
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('model_pricing')
      .select('api_cost_per_1k_tokens')
      .eq('platform', 'openai')
      .eq('model_id', model)
      .single();

    if (pricingError || !pricingData) {
      console.log('No pricing data found for model:', model, 'using default cost');
      // Use default pricing if not found
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_completion_tokens: 4096
      })
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
    const tokensToDeduct = Math.max(1, Math.ceil(actualApiCost * 10)); // Minimum 1 token

    console.log(`API usage: ${totalTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct} tokens`);

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
          api_cost_dollars: actualApiCost,
          api_cost_per_1k_tokens: apiCostPer1kTokens
        }
      });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('OpenAI function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
