
import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquare, Users, Zap, Shield, Brain } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: "Agentic Conductor AI",
      description: "An AI orchestrator that delegates, mediates, and synthesizes — the agentic workflow pattern that defined 2025-2026 frontier AI research, now in your hands."
    },
    {
      icon: <Bot className="h-8 w-8 text-blue-600" />,
      title: "7 Frontier Models",
      description: "GPT-5, Claude 4, Gemini 2.5 Pro, Grok-4, DeepSeek-R2 — every leading model family from reasoning to multimodal, updated for 2026."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-green-600" />,
      title: "Multi-Agent Reasoning",
      description: "Combine chain-of-thought, tool-use, and long-context capabilities across models to solve problems no single model can tackle alone."
    },
    {
      icon: <Users className="h-8 w-8 text-orange-600" />,
      title: "Real-Time AI Debates",
      description: "Watch models challenge, refine, and build on each other's ideas — the collaborative intelligence pattern driving enterprise AI adoption."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Autonomous Free Mode",
      description: "Launch multi-round AI discussions that run autonomously — observe emergent reasoning as agents iterate without manual prompting."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Encrypted & Token-Based",
      description: "API keys encrypted at rest, row-level security on every table, and transparent per-message token pricing — enterprise-grade security by default."
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Built for the Agentic AI Era</h2>
        <p className="text-muted-foreground text-lg">Everything you need to harness multi-model collaboration, powered by 2026's most capable AI systems</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature) => (
          <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {feature.icon}
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </div>
              <CardDescription className="text-base leading-relaxed">
                {feature.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
