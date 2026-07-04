// Probes a user-supplied OpenAI-compatible endpoint (LM Studio, Ollama,
// vLLM, llama.cpp server, etc.) and returns the models it actually exposes.
// Stateless on purpose — the client keeps the endpoint in local state and
// hands it to `local-chat` via the `<provider>::<model>` selector.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Turn a raw model id like "TheBloke/qwen2.5-coder-7b-instruct.Q4_K_M.gguf"
// into a readable "Qwen 2.5 Coder 7B Instruct".
const prettifyModelName = (raw: string): string => {
  if (!raw) return raw;
  let s = raw.split("/").pop() ?? raw;                    // drop org/path prefix
  s = s.replace(/\.(gguf|bin|safetensors|pt|onnx)$/i, ""); // drop file ext
  s = s.replace(/[._]+/g, "-");
  s = s.replace(/-(q\d+(_[a-z0-9]+)*|f16|f32|bf16|int8|int4|awq|gptq)$/i, ""); // quant tags
  return s
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (/^\d+(\.\d+)?[bBmM]$/.test(part)) return part.toUpperCase();       // 7B, 1.5B, 70B
      if (/^v?\d+(\.\d+)*$/.test(part)) return part;                          // 2.5, v0.3
      if (/^(gpt|llm|ai|api|sdk)$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user?.id) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const baseUrlRaw = String(body.base_url ?? "").trim();
    const providerName = String(body.name ?? "").trim() || "Local endpoint";

    if (!/^https?:\/\//i.test(baseUrlRaw)) {
      return json({ error: "base_url must start with http:// or https://" }, 400);
    }

    // Normalise: strip trailing slash; append /v1 if the caller left it off.
    let base = baseUrlRaw.replace(/\/+$/, "");
    if (!/\/v\d+$/.test(base) && !/\/api$/.test(base)) base = `${base}/v1`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    let payload: any;
    try {
      const res = await fetch(`${base}/models`, { signal: ctrl.signal });
      if (!res.ok) {
        return json({ error: `Endpoint returned ${res.status}` }, 502);
      }
      payload = await res.json();
    } catch (e) {
      return json({ error: `Could not reach ${base}: ${(e as Error).message}` }, 502);
    } finally {
      clearTimeout(timer);
    }

    const rawList: any[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.models)
      ? payload.models
      : [];

    const models = rawList
      .map((m) => {
        const id = String(m.id ?? m.name ?? m.model ?? "").trim();
        if (!id) return null;
        const displayName = String(m.display_name ?? m.name ?? "").trim() || prettifyModelName(id);
        return { id, name: displayName };
      })
      .filter((m): m is { id: string; name: string } => !!m && !/embed/i.test(m.id));

    if (!models.length) {
      return json({ error: "Endpoint reachable but exposed no chat models" }, 404);
    }

    // Provider id is a slug of the host — stable per endpoint, safe to reuse
    // as the `<provider>::<model>` prefix that `local-chat` splits on.
    const host = new URL(base).host.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const providerId = `custom-${host}`;

    return json({
      provider: {
        id: providerId,
        name: providerName,
        base_url: base,
        models,
      },
    });
  } catch (error) {
    console.error("add-local-model error:", error);
    return json({ error: "Request failed" }, 500);
  }
});
