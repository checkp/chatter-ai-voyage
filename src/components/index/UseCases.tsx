import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Columns3, Image as ImageIcon, Repeat } from 'lucide-react';

const useCases = [
  {
    icon: Search,
    tag: "Research",
    title: "Market research, grounded in sources",
    body: "Perplexity pulls live citations while GPT-5 and Claude 4 stress-test the framing. You get a balanced brief — with links — instead of a confident guess."
  },
  {
    icon: Columns3,
    tag: "Compare",
    title: "Isolated mode for honest comparisons",
    body: "Ask once, hear all eight independently. No model sees the others' answers — perfect for evaluating tone, accuracy, or which voice fits your work."
  },
  {
    icon: ImageIcon,
    tag: "Create",
    title: "One brief, several visual minds",
    body: "Fan the same image prompt across DALL·E, Gemini, Grok, and Pollinations FLUX. Choose the result that lands, instead of re-rolling a single model."
  },
  {
    icon: Repeat,
    tag: "Debate",
    title: "Let the models argue it out",
    body: "Conductor or Free Mode runs structured multi-round debates between agents — surfacing consensus, dissent, and the reasoning behind each."
  }
];

const UseCases: React.FC = () => {
  return (
    <section className="mb-20">
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <Badge variant="outline" className="mb-4 text-primary border-primary/20">
          What you can do here
        </Badge>
        <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4 tracking-tight">
          Eight perspectives, one quiet workspace
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          RoboHeard isn't another chatbot. It's a calm room where frontier models do the work side by side —
          so you decide which answer to trust.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {useCases.map((u, i) => (
          <Card key={i} className="border-border/60 hover:border-primary/30 hover:shadow-md transition-all">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <u.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {u.tag}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{u.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{u.body}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default UseCases;
