
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Local OpenAI-compatible providers, configured via env. Base URLs point at the
// host machine (Docker host gateway) — nothing leaves the box.
const PROVIDERS: Record<string, { name: string; base: string | undefined }> = {
  lmstudio: { name: "LM Studio", base: Deno.env.get("LMSTUDIO_BASE_URL") || undefined },
  ollama:   { name: "Ollama",    base: Deno.env.get("OLLAMA_BASE_URL") || undefined },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    const body = await req.json();

    // ── action: "models" — enumerate reachable local providers + their models ──
    if (body.action === "models") {
      const providers = await Promise.all(
        Object.entries(PROVIDERS).map(async ([id, p]) => {
          if (!p.base) return null;
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 3000);
            const r = await fetch(`${p.base.replace(/\/$/, "")}/models`, { signal: ctrl.signal });
            clearTimeout(t);
            if (!r.ok) return null;
            const j = await r.json();
            const models = (j.data ?? [])
              .map((m: any) => m.id)
              .filter((m: string) => !/embed/i.test(m)); // embedding models can't chat
            return models.length ? { id, name: p.name, models } : null;
          } catch (_) {
            return null; // provider not running — just omit it
          }
        })
      );
      return json({ providers: providers.filter(Boolean) });
    }

    // ── chat ────────────────────────────────────────────────────────────────
    const { messages, model } = body;
    // model arrives as "<provider>::<model-id>"
    const sep = String(model ?? "").indexOf("::");
    const providerId = sep > 0 ? model.slice(0, sep) : "lmstudio";
    const modelId = sep > 0 ? model.slice(sep + 2) : model;
    const provider = PROVIDERS[providerId];
    if (!provider?.base) {
      return json({ error: `Local provider not configured: ${providerId}` }, 400);
    }

    const response = await fetch(`${provider.base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, messages, max_tokens: 4096 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider.name} error: ${response.status} - ${errorText}`);
    }

    const data_response = await response.json();
    const content = data_response.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${provider.name} returned an empty response`);

    const totalTokens = data_response.usage?.total_tokens || 0;

    // Local inference is free — fixed 1-token ledger entry to keep usage visible.
    const { data: deductData, error: deductErr } = await supabaseClient.rpc("deduct_user_tokens", {
      p_user_id: user.id,
      p_tokens: 1,
    });
    if (deductErr) throw new Error(`token deduction failed: ${deductErr.message}`);
    const deductRow = Array.isArray(deductData) ? deductData[0] : deductData;
    if (!deductRow) return json({ error: "Insufficient tokens", required: 1 }, 402);

    await supabaseClient.from("token_transactions").insert({
      user_id: user.id,
      transaction_type: "consumption",
      amount: -1,
      balance_after: deductRow.new_balance,
      description: `${provider.name} ${modelId} (local) - ${totalTokens} tokens`,
      metadata: { platform: "local", provider: providerId, model: modelId, total_tokens: totalTokens, local: true, api_cost_dollars: 0, tokens_charged: 1 },
    });

    return json({ content });
  } catch (error) {
    console.error("local-chat error:", error);
    return json({ error: "Request failed" }, 500);
  }
});
