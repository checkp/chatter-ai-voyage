import { supabase } from '@/integrations/supabase/client';

interface AgentReply {
  platform: string;
  content: string;
}

function gatherSignals(user: any) {
  const now = new Date();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    language: navigator.language,
    languages: Array.from(navigator.languages || []),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: now.getHours(),
    weekday: weekdays[now.getDay()],
    platform: (navigator as any).userAgentData?.platform || navigator.platform,
    userAgent: navigator.userAgent,
    screen: { w: window.screen.width, h: window.screen.height, dpr: window.devicePixelRatio || 1 },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    referrer: document.referrer || undefined,
    email: user?.email,
    fullName: user?.user_metadata?.full_name || user?.user_metadata?.name,
    avatarUrl: user?.user_metadata?.avatar_url,
  };
}

/**
 * Create a "🕵️ Who are you?" demo conversation populated with 3 AI replies
 * profiling the user from the metadata available right after signup.
 * Returns the new conversation id, or null on failure.
 */
export async function seedProfileDemo(user: any): Promise<string | null> {
  if (!user) return null;

  try {
    const signals = gatherSignals(user);

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        title: "🕵️ Who are you? — the AIs guess",
        user_id: user.id,
        chat_mode: 'discussion',
      })
      .select('id')
      .single();

    if (convError || !conv) {
      console.error('seedProfileDemo: failed to create conversation', convError);
      return null;
    }

    // Seed the opening user-facing prompt as an AI "system" intro so the chat isn't empty
    // while the edge function runs.
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender: 'ai',
      platform: 'system',
      content:
        "👋 Welcome. Before you type a word — three AIs are about to guess who you are using only your browser, location, device and timing signals. No tricks. Watch.",
    });

    // Call edge function (auth required, JWT is sent automatically by supabase client)
    const { data, error } = await supabase.functions.invoke('profile-demo', {
      body: { signals },
    });

    if (error || !data?.responses) {
      console.error('seedProfileDemo: edge function failed', error);
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        sender: 'ai',
        platform: 'system',
        content: "The detective squad couldn't reach the AI gateway. Send any message to start chatting normally.",
      });
      return conv.id;
    }

    const replies: AgentReply[] = data.responses;
    // Insert sequentially with a tiny created_at gap so ordering is preserved.
    for (const r of replies) {
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        sender: 'ai',
        platform: r.platform,
        content: r.content,
      });
    }

    return conv.id;
  } catch (e) {
    console.error('seedProfileDemo error:', e);
    return null;
  }
}
