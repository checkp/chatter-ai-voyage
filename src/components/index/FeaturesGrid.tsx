
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, MessageSquare, Zap, Bot } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "Agentic Orchestration",
    description: "Conductor AI delegates tasks, mediates debates, and synthesizes results — the agentic workflow pattern defining 2026."
  },
  {
    icon: MessageSquare,
    title: "Four Collaboration Modes",
    description: "Conductor, Discussion, Isolated, and Side-by-Side — match the interaction pattern to your task."
  },
  {
    icon: Zap,
    title: "Autonomous Free Mode",
    description: "Launch multi-round AI debates that run autonomously — watch emergent reasoning unfold without manual prompting."
  },
  {
    icon: Bot,
    title: "7 Frontier Models",
    description: "GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2 and more — every 2025-2026 breakthrough model in one platform."
  }
];

const FeaturesGrid: React.FC = () => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
      {features.map((feature, index) => (
        <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeaturesGrid;
