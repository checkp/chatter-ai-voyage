
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

    const { messages, model = 'claude-3-5-haiku-20241022', user_id } = await req.json()
    console.log('Received messages:', messages?.length || 0, 'messages')

    // Check token balance
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_tokens')
      .select('balance, total_consumed')
      .eq('user_id', user_id || user.id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Unable to fetch token balance');
    }

    // Get pricing data for this model
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('model_pricing')
      .select('api_cost_per_1k_tokens')
      .eq('platform', 'anthropic')
      .eq('model_id', model)
      .single();

    if (pricingError || !pricingData) {
      throw new Error('Pricing data not found for this model');
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

    // Calculate cost in our token system
    const apiCostPer1kTokens = pricingData.api_cost_per_1k_tokens;
    const actualApiCost = (totalTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.ceil(actualApiCost / 0.001);

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
      .eq('user_id', user_id || user.id);

    // Log transaction with detailed metadata
    await supabaseClient
      .from('token_transactions')
      .insert({
        user_id: user_id || user.id,
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
