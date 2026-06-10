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
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding failed: ${res.status} ${t}`);
  }
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

    const body = await req.json().catch(() => ({}));
    const mode: "single" | "backfill" = body.mode === "backfill" ? "backfill" : "single";

    if (mode === "single") {
      const items: Array<{ message_id: string; conversation_id: string; content: string }> =
        Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return new Response(JSON.stringify({ ok: true, embedded: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify all conversations belong to user
      const convIds = [...new Set(items.map((i) => i.conversation_id))];
      const { data: convs } = await admin
        .from("conversations")
        .select("id, user_id, shared_context_enabled")
        .in("id", convIds);

      const allowedConvs = new Set(
        (convs ?? [])
          .filter((c: any) => c.user_id === user.id && c.shared_context_enabled !== false)
          .map((c: any) => c.id)
      );

      const rows: any[] = [];
      for (const it of items) {
        if (!allowedConvs.has(it.conversation_id)) continue;
        if (!it.content || it.content.trim().length < 4) continue;
        try {
          const vec = await embed(it.content);
          rows.push({
            user_id: user.id,
            conversation_id: it.conversation_id,
            message_id: it.message_id,
            content: it.content.slice(0, 2000),
            embedding: vec,
          });
        } catch (e) {
          console.error("embed item failed", it.message_id, e);
        }
      }

      if (rows.length > 0) {
        const { error } = await admin
          .from("message_embeddings")
          .upsert(rows, { onConflict: "message_id" });
        if (error) console.error("insert embeddings", error);
      }

      return new Response(JSON.stringify({ ok: true, embedded: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Backfill: process up to N un-embedded messages for this user
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
    const { data: msgs, error: mErr } = await admin
      .from("messages")
      .select("id, conversation_id, content, conversations!inner(user_id, shared_context_enabled)")
      .eq("conversations.user_id", user.id)
      .neq("conversations.shared_context_enabled", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (mErr) throw mErr;

    const ids = (msgs ?? []).map((m: any) => m.id);
    const { data: existing } = await admin
      .from("message_embeddings")
      .select("message_id")
      .in("message_id", ids);
    const have = new Set((existing ?? []).map((e: any) => e.message_id));

    const todo = (msgs ?? []).filter((m: any) => !have.has(m.id) && m.content?.trim().length >= 4);
    const rows: any[] = [];
    for (const m of todo) {
      try {
        const vec = await embed(m.content);
        rows.push({
          user_id: user.id,
          conversation_id: m.conversation_id,
          message_id: m.id,
          content: m.content.slice(0, 2000),
          embedding: vec,
        });
      } catch (e) {
        console.error("backfill embed failed", m.id, e);
      }
    }

    if (rows.length > 0) {
      await admin.from("message_embeddings").upsert(rows, { onConflict: "message_id" });
    }

    return new Response(JSON.stringify({ ok: true, scanned: msgs?.length ?? 0, embedded: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-messages error", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
