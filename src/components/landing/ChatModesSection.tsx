
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Users, Eye, Grid3X3, Check } from 'lucide-react';

const ChatModesSection = () => {
  const chatModes = [
    {
      name: "Conductor Mode",
      icon: <Brain className="h-6 w-6" />,
      description: "AI conductor orchestrates multi-agent discussions with role assignment and synthesis",
      features: ["Intelligent role delegation", "Comprehensive synthesis", "Structured conversations"]
    },
    {
      name: "Discussion Mode",
      icon: <Users className="h-6 w-6" />,
      description: "All AI agents can see each other's responses and build collaborative conversations",
      features: ["Cross-agent collaboration", "Rich context sharing", "Emergent insights"]
    },
    {
      name: "Isolated Mode", 
      icon: <Eye className="h-6 w-6" />,
      description: "Each agent only sees user messages and their own responses",
      features: ["Independent perspectives", "Unbiased responses", "Parallel processing"]
    },
    {
      name: "Side-by-Side Mode",
      icon: <Grid3X3 className="h-6 w-6" />,
      description: "Isolated mode with dedicated windows for each agent (desktop only)",
      features: ["Visual comparison", "Individual controls", "Response tracking"]
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Four Conversation Modes</h2>
        <p className="text-muted-foreground text-lg">Choose how your AI agents interact, from conductor-orchestrated to independent responses</p>
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
