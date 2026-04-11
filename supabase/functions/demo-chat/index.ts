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

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are in a multi-AI demo chat on RoboHeard. Be concise and direct — under 80 words. Show your unique perspective. No filler.`;

    // Call all 3 in parallel
    const [openaiResponse, claudeResponse, deepseekResponse] = await Promise.all([
      callOpenAI(message, systemPrompt),
      callClaude(message, systemPrompt),
      callDeepSeek(message, systemPrompt),
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
