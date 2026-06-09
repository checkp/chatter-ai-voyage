import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Per-user limits
const HOUR_LIMIT = 5;
const DAY_LIMIT = 20;
// Global daily cap across all demo users
const GLOBAL_DAILY_LIMIT = 2000;
// Hard token cap per response to bound cost
const MAX_TOKENS = 140;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function checkAndIncrementGlobal(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("demo_daily_usage")
    .select("total_calls")
    .eq("day", today)
    .maybeSingle();
  const current = data?.total_calls ?? 0;
  if (current >= GLOBAL_DAILY_LIMIT) return false;
  await supabaseAdmin
    .from("demo_daily_usage")
    .upsert({ day: today, total_calls: current + 1, updated_at: new Date().toISOString() });
  return true;
}

async function checkAndIncrementUser(userId: string): Promise<{ ok: boolean; reason?: string }> {
  const now = new Date();
  const { data } = await supabaseAdmin
    .from("demo_rate_limits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let hourStart = now;
  let dayStart = now;
  let hourCount = 0;
  let dayCount = 0;

  if (data) {
    hourStart = new Date(data.hour_window_start);
    dayStart = new Date(data.day_window_start);
    hourCount = data.hour_count;
    dayCount = data.day_count;
    if (now.getTime() - hourStart.getTime() > 60 * 60 * 1000) {
      hourStart = now;
      hourCount = 0;
    }
    if (now.getTime() - dayStart.getTime() > 24 * 60 * 60 * 1000) {
      dayStart = now;
      dayCount = 0;
    }
  }

  if (hourCount >= HOUR_LIMIT) return { ok: false, reason: "hour" };
  if (dayCount >= DAY_LIMIT) return { ok: false, reason: "day" };

  await supabaseAdmin.from("demo_rate_limits").upsert({
    user_id: userId,
    hour_window_start: hourStart.toISOString(),
    hour_count: hourCount + 1,
    day_window_start: dayStart.toISOString(),
    day_count: dayCount + 1,
    updated_at: now.toISOString(),
  });
  return { ok: true };
}

async function callOpenAI(message: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("openai not configured");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_completion_tokens: MAX_TOKENS,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callClaude(message: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("claude not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "No response.";
}

async function callDeepSeek(message: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("deepseek not configured");
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: MAX_TOKENS,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Require JWT (anonymous sessions are fine)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await supabaseAdmin.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const userId = claimsRes.claims.sub as string;

    // Per-user rate limit (unspoofable — keyed by JWT sub)
    const userCheck = await checkAndIncrementUser(userId);
    if (!userCheck.ok) {
      const msg = userCheck.reason === "hour"
        ? "You've reached the hourly demo limit. Sign up for unlimited access!"
        : "You've reached the daily demo limit. Sign up for unlimited access!";
      return new Response(JSON.stringify({ error: msg }), {
        status: 429,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Global daily spend cap
    const globalOk = await checkAndIncrementGlobal();
    if (!globalOk) {
      return new Response(
        JSON.stringify({ error: "Demo is taking a quick break. Sign up to keep chatting!" }),
        { status: 429, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const { message, userContext, turnIndex } = await req.json();
    if (!message || typeof message !== "string" || message.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const lang = userContext?.language || "en";
    const hour = userContext?.hour ?? 12;
    const platform = userContext?.platform || "desktop";
    const timeGreeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

    const baseContext = `You are a real AI agent in a live demo on RoboHeard — a multi-AI collaboration platform where GPT, Claude, and DeepSeek work together.

YOUR MISSION: You have ONE chance to impress this visitor. Make them want to stay.

RULES:
- Be warm, sharp, and genuinely helpful.
- Under 70 words. Precision > volume.
- Never say "as an AI."
- It's ${timeGreeting} for this user on ${platform}.
${lang !== "en" ? `- Browser language is "${lang}". If they write in a non-English language, respond in their language.` : ""}
- End with something curiosity-provoking.`;

    // Round-robin one model per turn — cuts API cost 3×
    const agents = [
      { id: "openai", prompt: baseContext + `\n\nYou are GPT. Pragmatic, structured, clear.`, call: callOpenAI },
      { id: "anthropic", prompt: baseContext + `\n\nYou are Claude. Thoughtful, nuanced, careful.`, call: callClaude },
      { id: "deepseek", prompt: baseContext + `\n\nYou are DeepSeek. Technical, unexpected, research-backed.`, call: callDeepSeek },
    ];
    const idx = Math.abs(Number(turnIndex) || 0) % agents.length;
    const agent = agents[idx];

    const content = await agent.call(message, agent.prompt);

    return new Response(
      JSON.stringify({ responses: [{ platform: agent.id, content }] }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Demo chat error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
