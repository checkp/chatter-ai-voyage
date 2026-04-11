
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const RESPONSES: Record<string, string[]> = {
  openai: [
    "Python is king for AI — rich ecosystem with PyTorch, TensorFlow, and scikit-learn. Fast prototyping wins.",
    "Great follow-up! I'd focus on transformer architectures — they've revolutionized NLP, vision, and even code generation.",
  ],
  anthropic: [
    "I'd add Rust is gaining traction for production ML inference — memory safety without garbage collection overhead.",
    "Building on that — the key is matching the tool to the task. Research? Python. Production inference? Rust or C++. Don't over-optimize early.",
  ],
  deepseek: [
    "From a research angle, Julia is worth watching — it combines Python's ease with C's speed for numerical computing.",
    "Agreed with the others. I'd emphasize that frameworks matter more than languages now. HuggingFace democratized access regardless of language choice.",
  ],
};

const GENERIC_RESPONSES: Record<string, string[]> = {
  openai: [
    "Interesting question! From my perspective, the key factors are scalability, ecosystem support, and developer experience.",
    "That's a nuanced topic. I'd recommend starting with the fundamentals and building up from practical use cases.",
  ],
  anthropic: [
    "I'd approach this differently — context matters a lot here. What's your specific use case? That shapes the best answer significantly.",
    "Adding to what the others said — I think the human element is often overlooked in these discussions. Simplicity wins long-term.",
  ],
  deepseek: [
    "From a technical standpoint, the latest research suggests a hybrid approach works best. Combine multiple tools for optimal results.",
    "Great discussion! I'd note that benchmarks only tell part of the story — real-world performance depends heavily on your specific constraints.",
  ],
};

const DemoChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DemoMessage[]>([
    { sender: 'ai', content: "Hey! Ask us anything — we're three AI models ready to collaborate.", platform: 'openai' },
    { sender: 'ai', content: "We each bring different perspectives. Try asking about tech, science, or ideas!", platform: 'anthropic' },
    { sender: 'ai', content: "Fire away! You'll see how multi-AI discussion works in real-time.", platform: 'deepseek' },
  ]);
  const [input, setInput] = useState('');
  const [sendCount, setSendCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const typewriterAppend = async (agentId: string, text: string) => {
    const tempId = Date.now() + Math.random();
    // Add empty message
    setMessages(prev => [...prev, { sender: 'ai', content: '', platform: agentId, typing: true }]);
    
    // Type character by character
    for (let i = 0; i <= text.length; i++) {
      await new Promise(r => setTimeout(r, 20));
      setMessages(prev => {
        const copy = [...prev];
        const idx = copy.length - 1;
        if (copy[idx]?.platform === agentId && copy[idx]?.typing) {
          copy[idx] = { ...copy[idx], content: text.slice(0, i) };
        }
        return copy;
      });
    }
    // Mark as done
    setMessages(prev => {
      const copy = [...prev];
      const idx = copy.length - 1;
      if (copy[idx]?.platform === agentId) {
        copy[idx] = { ...copy[idx], typing: false };
      }
      return copy;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    const newSendCount = sendCount + 1;
    setSendCount(newSendCount);

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', content: userMessage }]);

    if (newSendCount >= 2) {
      // Save conversation and redirect
      setTimeout(() => {
        const allMessages = [...messages, { sender: 'user' as const, content: userMessage }];
        localStorage.setItem('demo_conversation', JSON.stringify(allMessages));
        setShowCTA(true);
      }, 500);
      return;
    }

    // Simulate AI responses with typewriter
    setIsTyping(true);
    const responseIdx = Math.min(newSendCount - 1, 1);
    
    // Check if it's a programming/AI related question for tailored responses
    const isRelevant = /\b(programming|language|ai|python|code|rust|javascript|ml|machine learning)\b/i.test(userMessage);
    
    for (const agent of AGENTS) {
      const pool = isRelevant ? RESPONSES[agent.id] : GENERIC_RESPONSES[agent.id];
      const response = pool[responseIdx] || pool[0];
      await typewriterAppend(agent.id, response);
      await new Promise(r => setTimeout(r, 300));
    }
    setIsTyping(false);
  };

  const getAgent = (platformId: string) => AGENTS.find(a => a.id === platformId);

  const handleSignUp = () => {
    const allMessages = messages.filter(m => !m.typing);
    localStorage.setItem('demo_conversation', JSON.stringify(allMessages));
    navigate('/auth');
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-12">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Try it now — no signup needed</h2>
        <p className="text-muted-foreground">Send a message and watch three AI models collaborate in real-time</p>
      </div>
      
      <div className="relative rounded-xl border bg-card shadow-lg overflow-hidden">
        {/* Chat header */}
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <div className="flex -space-x-1">
            {AGENTS.map(a => (
              <span key={a.id} className="text-lg">{a.emoji}</span>
            ))}
          </div>
          <span className="text-sm font-medium text-muted-foreground">Live Demo — 3 AI Models</span>
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
                  <div className="text-card-foreground whitespace-pre-wrap">{msg.content}{msg.typing ? <span className="animate-pulse">▊</span> : ''}</div>
                  {agent && (
                    <div className={`mt-1 text-xs font-medium ${agent.color}`}>
                      {agent.emoji} {agent.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isTyping && messages[messages.length - 1]?.sender === 'user' && (
            <div className="text-xs text-muted-foreground animate-pulse">AI models are thinking...</div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-muted/20">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything... try 'What's the best programming language for AI?'"
              disabled={isTyping || showCTA}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping || showCTA}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {sendCount === 0 ? 'Send your first message to see multi-AI in action' : 
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
