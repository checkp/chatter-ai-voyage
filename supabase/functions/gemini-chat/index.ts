
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

    const { messages, model = 'gemini-2.0-flash', user_id } = await req.json();
    
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
      .eq('platform', 'google')
      .eq('model_id', model)
      .single();

    if (pricingError || !pricingData) {
      console.log('No pricing data found for model:', model, 'using default cost');
    }

    const geminiApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Google API key not configured");
    }

    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data_response = await response.json();
    const content = data_response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Gemini API returned empty response');
    }

    // Calculate token cost - use default if no pricing data
    const apiCostPer1kTokens = pricingData?.api_cost_per_1k_tokens || 0.001; // Default Gemini cost
    const estimatedTokens = Math.ceil((messages.reduce((acc: number, msg: any) => acc + msg.content.length, 0) + content.length) / 4);
    const actualApiCost = (estimatedTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.max(1, Math.ceil(actualApiCost * 10)); // Minimum 1 token

    console.log(`Gemini API usage: ~${estimatedTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct} tokens`);

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
        description: `Gemini ${model} API call - ~${estimatedTokens} tokens`,
        metadata: { 
          platform: 'google', 
          model: model,
          estimated_tokens: estimatedTokens,
          api_cost_dollars: actualApiCost,
          api_cost_per_1k_tokens: apiCostPer1kTokens
        }
      });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Gemini function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
