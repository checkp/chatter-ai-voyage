
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, HelpCircle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const prompts = {
  conversation: [
    'Summarize this article and list 5 key takeaways with action items: {paste your text or URL}.',
    'Brainstorm 7 product taglines for an eco-friendly water bottle targeting hikers.',
    "Explain transformers and attention like I'm new to ML, then give two real‑world examples.",
  ],
  conductor: [
    'Act as an AI Conductor. Coordinate OpenAI and Claude to propose a system design for a chat app. Ask clarifying questions first, then produce a concise plan.',
    'Review the conversation so far and propose the next 3 steps. Assign each to the best model and explain why.',
    'Assign roles: OpenAI = coding, Claude = critique & safety. Work together to implement a simple API spec for task tracking.',
  ],
};

function setSEO() {
  document.title = 'Help & Getting Started | RoboHeard';

  const ensureMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  ensureMeta('description', 'Help guide: features, chat vs conductor modes, and starter prompts to begin quickly.');

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${window.location.origin}/help`;
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Prompt copied');
  } catch {
    toast.error('Failed to copy');
  }
};

const Help: React.FC = () => {
  useEffect(() => {
    setSEO();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/50 to-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Help & Getting Started</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/">
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            <p className="mb-3">
              RoboHeard helps you chat with multiple AI models and orchestrate them using Conductor Mode.
              Use Chat for direct responses, or switch to Conductor when you want an AI to plan, assign, and
              coordinate tasks across models.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Chat</Badge>
              <Badge variant="secondary">Conductor</Badge>
              <Badge variant="secondary">Free Mode</Badge>
              <Badge variant="secondary">Image Gen</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat vs Conductor</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="chat">
                  <AccordionTrigger>Chat Mode</AccordionTrigger>
                  <AccordionContent>
                    Send a single prompt to one or multiple agents. Great for Q&A, drafting, coding, or quick
                    ideation. You control the flow.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="conductor">
                  <AccordionTrigger>Conductor Mode</AccordionTrigger>
                  <AccordionContent>
                    An orchestrator AI analyzes progress, proposes next steps, and assigns the right model to
                    each step. Best for multi‑step work, coordination, and summaries.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="free-mode">
                  <AccordionTrigger>Free Mode</AccordionTrigger>
                  <AccordionContent>
                    Fire off multiple agent messages automatically for rapid exploration. Configure message limit
                    and stop anytime.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>Switch modes from the header. You can isolate a single agent if needed.</li>
                <li>Use the status bar to reorder agents; drag to reprioritize.</li>
                <li>Use Settings to toggle agents and manage API keys.</li>
                <li>In Conductor mode, click “Request direction” for the next steps.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Starter Prompts — Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prompts.conversation.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-md border bg-card p-3">
                  <p className="text-sm leading-relaxed flex-1">{p}</p>
                  <Button variant="outline" size="sm" onClick={() => copyText(p)} aria-label="Copy conversation prompt">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Starter Prompts — Conductor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prompts.conductor.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-md border bg-card p-3">
                  <p className="text-sm leading-relaxed flex-1">{p}</p>
                  <Button variant="outline" size="sm" onClick={() => copyText(p)} aria-label="Copy conductor prompt">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Help;
