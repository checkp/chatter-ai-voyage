
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Authorization header received:', authHeader.substring(0, 20) + '...')

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed: ' + (authError?.message || 'User not found') }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User authenticated successfully:', user.id)

    const { messages, model = 'claude-sonnet-4-20250514' } = await req.json()
    const user_id = user.id;
    console.log('Received messages:', messages?.length || 0, 'messages')

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
      .eq('platform', 'anthropic')
      .eq('model_id', model)
      .single();

    if (pricingError || !pricingData) {
      console.log('No pricing data found for model:', model, 'using default cost');
    }

    // Use centralized Anthropic API key
    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeApiKey) {
      throw new Error("Anthropic API key not configured");
    }

    console.log('Using Anthropic API key:', claudeApiKey.substring(0, 10) + '...')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1000,
        messages: messages
      })
    })

    console.log('Claude API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: `Claude API error: ${response.status} - ${errorText}` }), 
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    console.log('Claude API response received successfully')

    // Calculate actual token cost based on usage
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Calculate token cost - use default if no pricing data
    const apiCostPer1kTokens = pricingData?.api_cost_per_1k_tokens || 0.001; // Default Claude cost
    const actualApiCost = (totalTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.max(1, Math.ceil(actualApiCost * 10)); // Minimum 1 token

    console.log(`Claude API usage: ${totalTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct} tokens`);

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
        description: `Claude ${model} API call - ${totalTokens} tokens`,
        metadata: { 
          platform: 'anthropic', 
          model: model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          api_cost_dollars: actualApiCost,
          api_cost_per_1k_tokens: apiCostPer1kTokens
        }
      });
    
    return new Response(
      JSON.stringify({ content: data.content[0].text }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
