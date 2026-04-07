
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Users, Eye, Grid3X3, Check } from 'lucide-react';

const ChatModesSection = () => {
  const chatModes = [
    {
      name: "Conductor Mode",
      icon: <Brain className="h-6 w-6" />,
      description: "An AI orchestrator assigns roles, mediates debates, and synthesizes multi-agent output into a single coherent answer — the agentic workflow pattern leading AI in 2026.",
      features: ["Agentic role delegation", "Real-time synthesis", "Conflict resolution"]
    },
    {
      name: "Discussion Mode",
      icon: <Users className="h-6 w-6" />,
      description: "Every agent sees all prior responses, enabling chain-of-thought collaboration where models build on each other's reasoning.",
      features: ["Chain-of-thought collaboration", "Cross-model context", "Emergent insights"]
    },
    {
      name: "Isolated Mode",
      icon: <Eye className="h-6 w-6" />,
      description: "Each model responds independently — ideal for unbiased benchmarking and comparing reasoning approaches side-by-side.",
      features: ["Zero cross-contamination", "Fair benchmarking", "Parallel inference"]
    },
    {
      name: "Side-by-Side Mode",
      icon: <Grid3X3 className="h-6 w-6" />,
      description: "Dedicated panels per agent let you visually compare outputs, refine prompts, and cherry-pick the best answers.",
      features: ["Visual comparison", "Per-agent controls", "Cherry-pick responses"]
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Four Conversation Modes</h2>
        <p className="text-muted-foreground text-lg">From agentic orchestration to independent benchmarking — choose the collaboration style that fits your task</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {chatModes.map((mode) => (
          <Card key={mode.name} className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {mode.icon}
                <CardTitle className="text-lg">{mode.name}</CardTitle>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                {mode.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {mode.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-xs">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ChatModesSection;
