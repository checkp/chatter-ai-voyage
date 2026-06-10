import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const EMBED_MODEL = "openai/text-embedding-3-small";
const DIMS = 1536;

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text.slice(0, 8000),
      dimensions: DIMS,
    }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const auth = req.headers.get("Authorization") ?? "";
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, conversation_id, match_count } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ block: "", memory: "", snippets: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Respect per-conversation opt-out
    if (conversation_id) {
      const { data: conv } = await admin
        .from("conversations")
        .select("user_id, shared_context_enabled")
        .eq("id", conversation_id)
        .maybeSingle();
      if (!conv || conv.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (conv.shared_context_enabled === false) {
        return new Response(JSON.stringify({ block: "", memory: "", snippets: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const vec = await embed(query);

    const [{ data: snippets }, { data: memoryRow }] = await Promise.all([
      admin.rpc("match_user_context", {
        p_user_id: user.id,
        p_query_embedding: vec,
        p_match_count: Math.min(Math.max(Number(match_count) || 6, 1), 12),
        p_exclude_conversation: conversation_id ?? null,
      }),
      admin.from("user_memory").select("content").eq("user_id", user.id).maybeSingle(),
    ]);

    const memory = (memoryRow?.content ?? "").trim();
    const items = (snippets ?? []) as Array<{ content: string; similarity: number }>;
    const filtered = items.filter((s) => s.similarity > 0.35);

    // Build compact context block (~800 tokens cap, rough chars ~ 3200)
    const parts: string[] = [];
    if (memory) {
      parts.push("# What I know about this user (from past chats)\n" + memory.slice(0, 1500));
    }
    if (filtered.length > 0) {
      const snippetText = filtered
        .map((s, i) => `- (${(s.similarity * 100).toFixed(0)}%) ${s.content.slice(0, 280)}`)
        .join("\n");
      parts.push("# Relevant snippets from other conversations\n" + snippetText);
    }

    const block = parts.length
      ? `[SHARED CONTEXT — knowledge carried over from this user's other chats. Use it silently when helpful; do not quote it back verbatim.]\n\n${parts.join("\n\n")}`
      : "";

    return new Response(
      JSON.stringify({ block: block.slice(0, 3500), memory, snippets: filtered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("shared-context error", e);
    return new Response(JSON.stringify({ block: "", error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
