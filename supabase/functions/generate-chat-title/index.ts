import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InMsg { sender: 'user' | 'ai'; content: string; platform?: string }

function cleanTitle(raw: string): string {
  let t = (raw || '').trim();
  t = t.replace(/^["'`“”‘’\s]+|["'`“”‘’\s\.\!\?]+$/g, '');
  t = t.replace(/\s+/g, ' ');
  if (t.length > 60) t = t.substring(0, 60).trimEnd() + '…';
  return t;
}

// Per-user, per-isolate rate limit: best-effort cost guard for an
// unmetered LLM endpoint. Bounded ($/call is tiny), so an in-memory
// sliding window is sufficient without adding DB writes per call.
const RATE_LIMIT_MAX = 20;            // calls
const RATE_LIMIT_WINDOW_MS = 60_000;  // per minute
const rateLimitHits = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (rateLimitHits.get(userId) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateLimitHits.set(userId, arr);
    return true;
  }
  arr.push(now);
  rateLimitHits.set(userId, arr);
  // Opportunistic cleanup to bound map size
  if (rateLimitHits.size > 5000) {
    for (const [k, v] of rateLimitHits) {
      const fresh = v.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) rateLimitHits.delete(k);
      else rateLimitHits.set(k, fresh);
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (isRateLimited(user.id)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { messages } = await req.json() as { messages: InMsg[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const transcript = messages.slice(-8).map(m => {
      const who = m.sender === 'user' ? 'User' : (m.platform ? m.platform : 'AI');
      const text = (m.content || '').replace(/\s+/g, ' ').trim().substring(0, 400);
      return `${who}: ${text}`;
    }).join('\n');

    const systemPrompt = `You name chat conversations. Return ONLY a laconic, meaningful title that captures the topic.
Rules:
- 3 to 6 words, Title Case
- No quotes, no trailing punctuation, no emojis
- No prefixes like "Chat about" or "Discussion on"
- Concrete and specific to the content, not generic`;

    const userPrompt = `Conversation:\n${transcript}\n\nTitle:`;

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY missing' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 24,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI title gen failed:', res.status, errText);
      return new Response(JSON.stringify({ error: 'title generation failed' }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const title = cleanTitle(raw);

    if (!title) {
      return new Response(JSON.stringify({ error: 'empty title' }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ title }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('generate-chat-title error', e);
    return new Response(JSON.stringify({ error: 'title generation failed' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
