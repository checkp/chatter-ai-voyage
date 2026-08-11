// NVIDIA-hosted NIM chat completions — OpenAI-compatible.
// Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
// Auth:     Authorization: Bearer ${NVIDIA_API_KEY}  (nvapi-...)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NVIDIA vision model ids we actively support. Attachments only get spliced in
// for these; text-only models silently ignore them.
const VISION_MODELS = new Set([
  "nvidia/nemotron-nano-12b-v2-vl",
  "nvidia/cosmos-reason2-8b",
  "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
  "meta/llama-3.2-90b-vision-instruct",
  "meta/llama-3.2-11b-vision-instruct",
  "microsoft/phi-3-vision-128k-instruct",
  "minimaxai/minimax-m3",
]);

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

    const { messages, model, attachments , max_output_tokens } = await req.json();
    const outBudget = Math.min(Math.max(Number(max_output_tokens) || 4096, 256), 32000);
    const user_id = user.id;

    if (!model || typeof model !== "string") {
      return new Response(JSON.stringify({ error: "Missing model" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Splice image/pdf attachments into the last user message for vision models.
    if (Array.isArray(attachments) && attachments.length > 0 && VISION_MODELS.has(model)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          const textPart = { type: "text", text: messages[i].content };
          const mediaParts = attachments
            .slice(0, 6)
            .map((a: any) => {
              if (typeof a?.dataUrl !== "string") return null;
              if (a.dataUrl.startsWith("data:image/")) {
                return { type: "image_url", image_url: { url: a.dataUrl } };
              }
              return null;
            })
            .filter(Boolean);
          messages[i] = { role: "user", content: [textPart, ...mediaParts] };
          break;
        }
      }
    }

    // Token balance — create initial row if missing.
    let { data: tokenData, error: tokenError } = await supabaseClient
      .from("user_tokens")
      .select("balance, total_consumed")
      .eq("user_id", user_id)
      .single();

    if (tokenError || !tokenData) {
      const { data: newTokenData, error: createError } = await supabaseClient
        .from("user_tokens")
        .insert({ user_id, balance: 300, total_purchased: 0, total_consumed: 0 })
        .select("balance, total_consumed")
        .single();
      if (createError) throw new Error("Unable to initialize token balance");
      tokenData = newTokenData;
    }

    const { data: pricingData, error: pricingError } = await supabaseClient
      .from("model_pricing")
      .select("api_cost_per_1k_tokens, tokens_per_message")
      .eq("platform", "nvidia")
      .eq("model_id", model)
      .maybeSingle();

    if (pricingError || !pricingData) {
      console.warn("Invalid NVIDIA model requested:", model);
      return new Response(JSON.stringify({ error: "Invalid model" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const minTokens = pricingData.tokens_per_message || 1;
    if (tokenData.balance < minTokens) {
      return new Response(
        JSON.stringify({ error: "Insufficient tokens", required: minTokens, available: tokenData.balance }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nvidiaApiKey = Deno.env.get("NVIDIA_API_KEY");
    if (!nvidiaApiKey) throw new Error("NVIDIA API key not configured");

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nvidiaApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: outBudget,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NVIDIA API error ${response.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ error: "NVIDIA request failed", status: response.status, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data_response = await response.json();
    const content = data_response.choices?.[0]?.message?.content;
    if (!content) throw new Error("NVIDIA returned an empty response");

    const promptTokens = data_response.usage?.prompt_tokens || 0;
    const completionTokens = data_response.usage?.completion_tokens || 0;
    const totalTokens = data_response.usage?.total_tokens || promptTokens + completionTokens;

    const apiCostPer1kTokens = pricingData.api_cost_per_1k_tokens || 0.001;
    const actualApiCost = (totalTokens / 1000) * apiCostPer1kTokens;
    const tokensToDeduct = Math.max(1, Math.ceil((actualApiCost * 1.20) / 0.001));

    console.log(`NVIDIA ${model}: ${totalTokens} tokens, cost $${actualApiCost}, deducting ${tokensToDeduct}`);

    const { data: deductData, error: deductErr } = await supabaseClient.rpc("deduct_user_tokens", {
      p_user_id: user_id,
      p_tokens: tokensToDeduct,
    });
    if (deductErr) throw new Error(`token deduction failed: ${deductErr.message}`);
    const deductRow = Array.isArray(deductData) ? deductData[0] : deductData;
    if (!deductRow) {
      return new Response(
        JSON.stringify({ error: "Insufficient tokens", required: tokensToDeduct, available: tokenData.balance }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabaseClient.from("token_transactions").insert({
      user_id,
      transaction_type: "consumption",
      amount: -tokensToDeduct,
      balance_after: deductRow.new_balance,
      description: `NVIDIA ${model} - ${totalTokens} tokens`,
      metadata: {
        platform: "nvidia",
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        api_cost_dollars: actualApiCost,
        tokens_charged: tokensToDeduct,
        app_token_usd: 0.001,
        margin: 1.20,
        api_cost_per_1k_tokens: apiCostPer1kTokens,
      },
    });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("NVIDIA function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
