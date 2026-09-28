import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Radar, BrainCog, Columns2 } from 'lucide-react';

const hackerAngles = [
  {
    icon: Radar,
    tag: 'Agentic SEO',
    title: 'Agentic SEO & Brand Perception',
    body: 'Research what the AIs think about your product, your site, or your competitors — and see how SEO works in an agentic era. "What did the robots hear?"'
  },
  {
    icon: BrainCog,
    tag: 'Model Psychology',
    title: 'Model Psychology & Training Priors',
    body: 'Explore the differences in training, perspective, and attitude across models. Every agent carries its own worldview — poke at it.'
  },
  {
    icon: Columns2,
    tag: 'Prompt Diffs',
    title: 'Side-by-Side Prompt Diffs',
    body: 'Compare raw reasoning traces, latency, and hallucinations across frontier models in real time — same prompt, nine honest answers.'
  }
];

const HackerAngles: React.FC = () => {
  return (
    <section className="mb-20">
      <div className="text-center mb-10 max-w-3xl mx-auto">
        <Badge variant="outline" className="mb-4 text-primary border-primary/20">
          For the tinkerers
        </Badge>
        <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-3 tracking-tight">
          Three ways to probe the herd
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {hackerAngles.map((a) => (
          <Card key={a.title} className="border-border/60 hover:border-primary/30 hover:shadow-md transition-all">
            <CardContent className="p-6 md:p-8">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <a.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {a.tag}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{a.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{a.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default HackerAngles;
