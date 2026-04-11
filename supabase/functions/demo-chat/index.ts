import { corsHeaders } from "https://deno.land/x/cors@v1.2.2/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple in-memory rate limiter (resets on cold start)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 5; // per IP per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

async function callOpenAI(message: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return "OpenAI is not configured for demo.";
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_completion_tokens: 200,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from GPT.";
}

async function callClaude(message: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return "Claude is not configured for demo.";
  
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "No response from Claude.";
}

async function callDeepSeek(message: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) return "DeepSeek is not configured for demo.";
  
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 200,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from DeepSeek.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Sign up for unlimited access!" }), {
        status: 429,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { message, userContext } = await req.json();
    if (!message || typeof message !== "string" || message.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Derive user context clues for personalized tone
    const lang = userContext?.language || "en";
    const hour = userContext?.hour ?? 12;
    const platform = userContext?.platform || "desktop";
    const timeGreeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

    const baseContext = `You are a real AI agent in a live demo on RoboHeard — a multi-AI collaboration platform where GPT, Claude, and DeepSeek work together.

YOUR MISSION: You have ONE chance to impress this visitor and make them want to stay. This is a live sales demo. Every word matters.

RULES:
- Be warm, sharp, and genuinely helpful. Make the user feel like they discovered something special.
- Show your UNIQUE personality — don't sound like the other agents. Disagree respectfully, add unexpected angles, build on each other.
- Keep it under 80 words. Precision > volume.
- Never say "as an AI" or "I'm just a language model." You're a team member here.
- If you can tell what the user cares about, lean into that. Match their energy.
- It's ${timeGreeting} for this user. They're on ${platform}. Adapt your tone — ${timeGreeting === "evening" ? "be chill and conversational" : timeGreeting === "morning" ? "be energetic and crisp" : "be balanced and insightful"}.
${lang !== "en" ? `- The user's browser language is "${lang}". If they write in a non-English language, RESPOND IN THEIR LANGUAGE. Show you're multilingual.` : ""}
- End with something that makes them curious to ask more — not a generic "let me know if you have questions."`;

    const openaiPrompt = baseContext + `\n\nYou are GPT. You're the pragmatic one — clear, structured, gets to the point. You're the reliable friend who gives the best advice. Show why having you on the team is a no-brainer.`;
    const claudePrompt = baseContext + `\n\nYou are Claude. You're the thoughtful one — you see nuance others miss, you challenge assumptions gently, and you care about getting it RIGHT not just fast. Show depth.`;
    const deepseekPrompt = baseContext + `\n\nYou are DeepSeek. You're the wildcard — technical depth, unexpected connections, research-backed insights. You bring the "wow, I didn't think of that" moment. Surprise them.`;

    // Call all 3 in parallel
    const [openaiResponse, claudeResponse, deepseekResponse] = await Promise.all([
      callOpenAI(message, openaiPrompt),
      callClaude(message, claudePrompt),
      callDeepSeek(message, deepseekPrompt),
    ]);

    return new Response(JSON.stringify({
      responses: [
        { platform: "openai", content: openaiResponse },
        { platform: "anthropic", content: claudeResponse },
        { platform: "deepseek", content: deepseekResponse },
      ],
    }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Demo chat error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
