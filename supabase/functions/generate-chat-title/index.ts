const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InMsg { sender: 'user' | 'ai'; content: string; platform?: string }

function cleanTitle(raw: string): string {
  let t = (raw || '').trim();
  // strip wrapping quotes / trailing punctuation
  t = t.replace(/^["'`“”‘’\s]+|["'`“”‘’\s\.\!\?]+$/g, '');
  // collapse whitespace
  t = t.replace(/\s+/g, ' ');
  // cap length
  if (t.length > 60) t = t.substring(0, 60).trimEnd() + '…';
  return t;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { messages } = await req.json() as { messages: InMsg[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Build a compact transcript (last 8 messages, trim each)
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
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
