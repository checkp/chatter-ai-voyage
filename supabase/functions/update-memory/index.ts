import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const DISTILL_MODEL = "google/gemini-2.5-flash";

const SYSTEM = `You maintain a compact, durable memory document about a single user, drawn from their chat history.
Keep ONLY stable, reusable facts: who they are, ongoing projects, preferences, recurring topics, tools they use, decisions they've made.
Drop chit-chat, one-off questions, and anything time-sensitive. Be terse. Markdown bullets under short headers.
Max ~1200 characters. Rewrite (not append) — produce the new full document.`;

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

    // Debounce: skip if updated in the last 2 minutes
    const { data: existing } = await admin
      .from("user_memory")
      .select("content, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.updated_at) {
      const age = Date.now() - new Date(existing.updated_at).getTime();
      if (age < 2 * 60 * 1000) {
        return new Response(JSON.stringify({ ok: true, skipped: "debounced" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Pull the last ~30 user messages across all shared-context-enabled chats
    const { data: msgs } = await admin
      .from("messages")
      .select("content, sender, created_at, conversations!inner(user_id, shared_context_enabled)")
      .eq("conversations.user_id", user.id)
      .neq("conversations.shared_context_enabled", false)
      .eq("sender", "user")
      .order("created_at", { ascending: false })
      .limit(40);

    const recentUserText = (msgs ?? [])
      .reverse()
      .map((m: any) => `- ${m.content?.slice(0, 400) ?? ""}`)
      .join("\n")
      .slice(0, 6000);

    if (!recentUserText.trim()) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Current memory document (rewrite, don't append):\n---\n${
      existing?.content || "(empty)"
    }\n---\n\nRecent user messages across all their chats:\n${recentUserText}\n\nReturn the new memory document as markdown. Be ruthlessly concise.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: DISTILL_MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Distill failed: ${res.status} ${t}`);
    }
    const data = await res.json();
    const newDoc = (data.choices?.[0]?.message?.content ?? "").trim().slice(0, 2000);

    if (!newDoc) {
      return new Response(JSON.stringify({ ok: true, skipped: "empty_distill" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("user_memory")
      .upsert({ user_id: user.id, content: newDoc }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ ok: true, length: newDoc.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-memory error", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
