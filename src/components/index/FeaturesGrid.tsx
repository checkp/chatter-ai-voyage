
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Layers, Search, Image as ImageIcon, Bot, Wand2 } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "Agentic Orchestration",
    description: "Conductor AI delegates, mediates and synthesises across models — the orchestration pattern defining 2026."
  },
  {
    icon: Layers,
    title: "Isolated Comparison",
    description: "Send one prompt, read each model's reply side by side. Quietly judge tone, depth and accuracy on your terms."
  },
  {
    icon: Search,
    title: "Live Market Research",
    description: "Perplexity grounds queries in real-time sources while peers cross-check claims — citations included, no hand-waving."
  },
  {
    icon: ImageIcon,
    title: "Multi-Model Image Studio",
    description: "Generate the same brief through DALL·E, Gemini, Grok, and Pollinations FLUX in one pass — pick the frame that fits."
  },
  {
    icon: Bot,
    title: "8 Frontier Models",
    description: "GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, Mistral, Perplexity and Qwen — every flagship in one calm interface."
  },
  {
    icon: Wand2,
    title: "Autonomous Free Mode",
    description: "Let models debate across multiple rounds, hands-off. Emergent reasoning, without the manual nudging."
  }
];

const FeaturesGrid: React.FC = () => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
      {features.map((feature, index) => (
        <Card key={index} className="text-center p-6 hover:shadow-md transition-shadow border-border/60">
          <CardContent className="pt-6">
            <feature.icon className="h-10 w-10 text-primary mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeaturesGrid;
