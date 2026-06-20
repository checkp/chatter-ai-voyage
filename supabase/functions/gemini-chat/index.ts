
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEGACY_MODEL_MAP: Record<string, string> = {
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-2.5-pro",
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.0-flash-exp": "gemini-2.5-flash",
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.id) throw new Error("User not authenticated");

    const { messages, model = "gemini-2.5-flash", attachments } = await req.json();
    const user_id = user.id;
    const resolvedModel = LEGACY_MODEL_MAP[model] ?? model;

    if (resolvedModel !== model) {
      console.log(`Resolved Gemini model ${model} to ${resolvedModel}`);
    }
    
    let { data: tokenData, error: tokenError } = await supabaseClient
      .from("user_tokens")
      .select("balance, total_consumed")
      .eq("user_id", user_id)
      .single();

    if (tokenError || !tokenData) {
      console.log("Creating initial token balance for user:", user_id);
      const { data: newTokenData, error: createError } = await supabaseClient
        .from("user_tokens")
        .insert({
          user_id,
          balance: 300,
          total_purchased: 0,
          total_consumed: 0,
        })
        .select("balance, total_consumed")
        .single();

      if (createError) {
        console.error("Error creating token balance:", createError);
        throw new Error("Unable to initialize token balance");
      }
      
      tokenData = newTokenData;
    }

    const { data: pricingData, error: pricingError } = await supabaseClient
      .from("model_pricing")
      .select("api_cost_per_1k_tokens, tokens_per_message")
      .eq("platform", "google")
      .eq("model_id", resolvedModel)
      .maybeSingle();

    if (pricingError || !pricingData) {
      console.warn("Invalid model requested:", resolvedModel);
      return new Response(JSON.stringify({ error: "Invalid model" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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


    const geminiApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Google API key not configured");
    }

    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Append image attachments as inline_data parts to the last user message
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (let i = geminiMessages.length - 1; i >= 0; i--) {
        if (geminiMessages[i].role === "user") {
          const imageParts = attachments
            .filter((a: any) => typeof a?.dataUrl === 'string' && a.dataUrl.startsWith('data:image/'))
            .slice(0, 4)
            .map((a: any) => {
              const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(a.dataUrl);
              if (!match) return null;
              return { inline_data: { mime_type: match[1], data: match[2] } };
            })
            .filter(Boolean);
          geminiMessages[i].parts.push(...imageParts);
          break;
        }
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${resolvedModel}:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('Gemini API request failed');
    }


    const data_response = await response.json();
    const content = data_response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("Gemini API returned empty response");
    }

    const apiCostPer1kTokens = pricingData?.api_cost_per_1k_tokens || 0.001;
    const estimatedTokens = Math.ceil((messages.reduce((acc: number, msg: any) => acc + msg.content.length, 0) + content.length) / 4);
    const actualApiCost = (estimatedTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.max(1, Math.ceil((actualApiCost * 1.20) / 0.001));

    console.log(`Gemini API usage: ~${estimatedTokens} tokens, cost: $${actualApiCost}, deducting: ${tokensToDeduct} tokens`);

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
      .from("token_transactions")
      .insert({
        user_id,
        transaction_type: "consumption",
        amount: -tokensToDeduct,
        balance_after: newBalance,
        description: `Gemini ${resolvedModel} API call - ~${estimatedTokens} tokens`,
        metadata: { 
          platform: "google",
          model: resolvedModel,
          requested_model: model,
          estimated_tokens: estimatedTokens,
          api_cost_dollars: actualApiCost, tokens_charged: tokensToDeduct, app_token_usd: 0.001, margin: 1.20,
          api_cost_per_1k_tokens: apiCostPer1kTokens,
        },
      });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Gemini function error:", error);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});