
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface DemoMessage {
  sender: 'user' | 'ai';
  content: string;
  platform?: string;
  typing?: boolean;
}

const AGENTS = [
  { id: 'openai', name: 'GPT', emoji: '🤖', color: 'text-[#6B8E6B]', borderColor: 'border-l-[#8FBC8F]', bg: 'bg-[#8FBC8F]/5' },
  { id: 'anthropic', name: 'Claude', emoji: '🎭', color: 'text-[#7AC464]', borderColor: 'border-l-[#98D982]', bg: 'bg-[#98D982]/5' },
  { id: 'deepseek', name: 'DeepSeek', emoji: '🔍', color: 'text-[#69B7CD]', borderColor: 'border-l-[#87CEEB]', bg: 'bg-[#87CEEB]/5' },
];

const DemoChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DemoMessage[]>([
    { sender: 'ai', content: "Welcome in. I'm GPT — ask me something wild and watch what happens. 🎯", platform: 'openai' },
    { sender: 'ai', content: "I'm Claude. I tend to see angles others miss. Test me — I dare you.", platform: 'anthropic' },
    { sender: 'ai', content: "DeepSeek here. I dig deep where others skim. Let's go. 🔬", platform: 'deepseek' },
  ]);
  const [input, setInput] = useState('');
  const [sendCount, setSendCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Ensure we have a session (anonymous is fine) so the demo function can rate-limit per user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
    })();
  }, []);


  const typewriterAppend = async (platform: string, text: string) => {
    setMessages(prev => [...prev, { sender: 'ai', content: '', platform, typing: true }]);

    for (let i = 0; i <= text.length; i++) {
      await new Promise(r => setTimeout(r, 15));
      setMessages(prev => {
      const copy = [...prev];
        let idx = -1;
        for (let j = copy.length - 1; j >= 0; j--) {
          if (copy[j].platform === platform && copy[j].typing) { idx = j; break; }
        }
        if (idx !== -1) {
          copy[idx] = { ...copy[idx], content: text.slice(0, i) };
        }
        return copy;
      });
    }

    setMessages(prev => {
      const copy = [...prev];
      let idx = -1;
      for (let j = copy.length - 1; j >= 0; j--) {
        if (copy[j].platform === platform && copy[j].typing) { idx = j; break; }
      }
      if (idx !== -1) copy[idx] = { ...copy[idx], typing: false };
      return copy;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newSendCount = sendCount + 1;
    setSendCount(newSendCount);

    setMessages(prev => [...prev, { sender: 'user', content: userMessage }]);

    setIsLoading(true);

    try {
      // Ensure session exists right before invoking (handles slow network)
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        await supabase.auth.signInAnonymously();
      }

      const { data, error } = await supabase.functions.invoke('demo-chat', {
        body: {
          message: userMessage,
          turnIndex: newSendCount - 1,
          userContext: {
            language: navigator.language || 'en',
            hour: new Date().getHours(),
            platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          },
        },
      });

      if (error) throw error;

      const responses: { platform: string; content: string }[] = data?.responses || [];

      // Typewriter each response sequentially
      for (const resp of responses) {
        await typewriterAppend(resp.platform, resp.content);
        await new Promise(r => setTimeout(r, 200));
      }

    } catch (err) {
      console.error('Demo chat error:', err);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', content: "Oops — our demo hit a snag. Sign up for the full experience!", platform: 'openai' },
      ]);
    } finally {
      setIsLoading(false);
    }

    // After the 2nd message, save conversation and show CTA
    if (newSendCount >= 2) {
      setTimeout(() => {
        setMessages(prev => {
          const allMessages = prev.filter(m => !m.typing);
          localStorage.setItem('demo_conversation', JSON.stringify(allMessages));
          return prev;
        });
        setShowCTA(true);
      }, 500);
    }
  };

  const getAgent = (platformId: string) => AGENTS.find(a => a.id === platformId);

  const handleSignUp = () => {
    const allMessages = messages.filter(m => !m.typing);
    localStorage.setItem('demo_conversation', JSON.stringify(allMessages));
    navigate('/auth');
  };

  return (
    <div className="w-full">
      <div className="relative rounded-xl border bg-card shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <div className="flex -space-x-1">
            {AGENTS.map(a => <span key={a.id} className="text-lg">{a.emoji}</span>)}
          </div>
          <span className="text-sm font-medium text-muted-foreground">Live Demo — 3 Real AI Models</span>
          <div className="ml-auto flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-[350px] overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => {
            if (msg.sender === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%] text-sm">
                    {msg.content}
                  </div>
                </div>
              );
            }
            const agent = getAgent(msg.platform || '');
            return (
              <div key={i} className="flex justify-start">
                <div className={`rounded-lg px-4 py-2 max-w-[85%] text-sm border-l-4 ${agent?.borderColor || 'border-l-border'} ${agent?.bg || 'bg-muted/50'}`}>
                  <div className="text-card-foreground whitespace-pre-wrap">
                    {msg.content}
                    {msg.typing && <span className="animate-pulse">▊</span>}
                  </div>
                  {agent && (
                    <div className={`mt-1 text-xs font-medium ${agent.color}`}>
                      {agent.emoji} {agent.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && !messages.some(m => m.typing) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              AI models are thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-muted/20">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything... e.g. 'What's the future of AI?'"
              disabled={isLoading || showCTA}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading || showCTA}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {sendCount === 0 ? 'These are real AI responses — not simulated' :
             sendCount === 1 ? '1 more message before signup — make it count!' : ''}
          </p>
        </div>

        {/* CTA Overlay */}
        {showCTA && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold mb-2">You're hooked! Keep going.</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Sign up free to continue this conversation with real AI models — your messages will be waiting for you.
            </p>
            <Button onClick={handleSignUp} size="lg" className="gap-2">
              Continue Chatting <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Free 300 tokens on signup • No credit card needed</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoChat;
