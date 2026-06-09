// Profile-Demo edge function
// On signup, three AI agents play detective and "expose" what they can infer about the user
// from purely client-side signals (IP geo via header, UA, language, timezone, hour, referrer, screen).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);


interface Signals {
  language?: string;
  languages?: string[];
  timezone?: string;
  hour?: number;
  weekday?: string;
  platform?: string;
  userAgent?: string;
  screen?: { w: number; h: number; dpr: number };
  viewport?: { w: number; h: number };
  referrer?: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  city?: string;
  region?: string;
  country?: string;
  ip?: string;
}

function buildBrief(s: Signals): string {
  const lines = [
    s.email ? `- email: ${s.email}` : null,
    s.fullName ? `- name on profile: ${s.fullName}` : null,
    s.avatarUrl ? `- has avatar: yes` : null,
    s.ip ? `- IP: ${s.ip}` : null,
    s.country || s.region || s.city ? `- geo (IP): ${[s.city, s.region, s.country].filter(Boolean).join(", ")}` : null,
    s.timezone ? `- timezone: ${s.timezone}` : null,
    s.hour !== undefined ? `- local hour: ${s.hour}:00` : null,
    s.weekday ? `- local weekday: ${s.weekday}` : null,
    s.language ? `- primary language: ${s.language}` : null,
    s.languages?.length ? `- accepted languages: ${s.languages.slice(0, 4).join(", ")}` : null,
    s.platform ? `- OS/platform: ${s.platform}` : null,
    s.userAgent ? `- user agent: ${s.userAgent}` : null,
    s.screen ? `- screen: ${s.screen.w}x${s.screen.h} @${s.screen.dpr}x` : null,
    s.viewport ? `- viewport: ${s.viewport.w}x${s.viewport.h}` : null,
    s.referrer ? `- referrer: ${s.referrer}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

async function callLovableAI(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return "(AI gateway unavailable)";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "(no response)";
    } catch (e) {
      if (attempt === 2) return `(error contacting AI: ${(e as Error).message})`;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return "(no response)";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Require a valid JWT (signed-in users only — this powers onboarding)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const signals: Signals = body.signals || {};


    // Pull IP from request headers if not provided
    if (!signals.ip) {
      signals.ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    }
    // Cloudflare-style geo headers (Supabase Edge runtime exposes some of these)
    signals.country = signals.country || req.headers.get("x-country-code") || req.headers.get("cf-ipcountry") || undefined;
    signals.city = signals.city || req.headers.get("x-city") || undefined;
    signals.region = signals.region || req.headers.get("x-region") || undefined;

    const brief = buildBrief(signals);

    const baseRules = `You are part of a 3-AI detective squad in a LIVE onboarding demo on RoboHeard. A new user just signed up — they have NOT typed anything yet. Your job is to wow them by inferring who they are from the metadata below.

GROUND RULES:
- Be playful, sharp, and a little cheeky — like Sherlock with a sense of humor.
- ONLY use signals provided. NEVER fabricate specifics (don't invent a city if none given, don't guess a name from email unless the email obviously contains it).
- Make 3-5 specific inferences with brief reasoning. Format as a tight bulleted list.
- Show your unique angle vs the other agents (you'll see what they could see too).
- Keep it under 110 words. End with one provocative question inviting the user to reply.
- Respond in the user's primary language (use the language signal). If unknown, use English.
- Do NOT include disclaimers about privacy or being an AI. The user is here for the magic show.

USER SIGNALS:
${brief || "(no signals captured)"}`;

    const gptPrompt = baseRules + `\n\nYOUR ROLE: You are GPT — the profiler. Focus on demographics, lifestyle, and likely profession. Lead with the boldest guess.`;
    const claudePrompt = baseRules + `\n\nYOUR ROLE: You are Claude — the behaviorist. Focus on habits, mindset, what brought them here right now (time of day, day of week, referrer). Read between the lines.`;
    const deepseekPrompt = baseRules + `\n\nYOUR ROLE: You are DeepSeek — the tech profiler. Focus on their device, setup, and what it reveals (power user vs casual, dev vs designer vs exec, mobile-first vs desktop-heavy).`;

    const userTurn = "Go. Tell me who I am.";

    const [gpt, claude, deepseek] = await Promise.all([
      callLovableAI(gptPrompt, userTurn, "google/gemini-2.5-flash"),
      callLovableAI(claudePrompt, userTurn, "google/gemini-2.5-flash"),
      callLovableAI(deepseekPrompt, userTurn, "google/gemini-2.5-flash"),
    ]);

    return new Response(
      JSON.stringify({
        responses: [
          { platform: "openai", content: gpt },
          { platform: "anthropic", content: claude },
          { platform: "deepseek", content: deepseek },
        ],
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("profile-demo error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
