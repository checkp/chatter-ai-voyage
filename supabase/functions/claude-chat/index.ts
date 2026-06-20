
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated successfully:', user.id)

    const { messages, model = 'claude-sonnet-4-20250514', attachments } = await req.json()
    const user_id = user.id;
    console.log('Received messages:', messages?.length || 0, 'messages')

    // Splice image attachments into the last user message (Claude vision format)
    if (Array.isArray(attachments) && attachments.length > 0 && /claude-(3|opus|sonnet|haiku|4)/i.test(model)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          const textPart = { type: 'text', text: messages[i].content };
          const imageParts = attachments
            .filter((a: any) => typeof a?.dataUrl === 'string' && a.dataUrl.startsWith('data:image/'))
            .slice(0, 4)
            .map((a: any) => {
              const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(a.dataUrl);
              if (!match) return null;
              return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
            })
            .filter(Boolean);
          messages[i] = { role: 'user', content: [textPart, ...imageParts] };
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

    // Validate model against allowlist (model_pricing table)
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('model_pricing')
      .select('api_cost_per_1k_tokens, tokens_per_message')
      .eq('platform', 'anthropic')
      .eq('model_id', model)
      .maybeSingle();

    if (pricingError || !pricingData) {
      console.warn('Invalid model requested:', model);
      return new Response(
        JSON.stringify({ error: 'Invalid model' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pre-call balance check (prevents zero-balance users from triggering paid API calls)
    const minTokens = pricingData?.tokens_per_message || 1;
    if (tokenData.balance < minTokens) {
      return new Response(JSON.stringify({ error: 'Insufficient tokens', required: minTokens, available: tokenData.balance }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        max_tokens: 4096,
        messages: messages
      })
    })

    console.log('Claude API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Upstream AI request failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const tokensToDeduct = Math.max(1, Math.ceil((actualApiCost * 1.20) / 0.001)); // Minimum 1 token

    console.log(`Claude API usage: ${totalTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct} tokens`);

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
        description: `Claude ${model} API call - ${totalTokens} tokens`,
        metadata: { 
          platform: 'anthropic', 
          model: model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          api_cost_dollars: actualApiCost, tokens_charged: tokensToDeduct, app_token_usd: 0.001, margin: 1.20,
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
      JSON.stringify({ error: 'Request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
