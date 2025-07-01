
import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bot, 
  MessageSquare, 
  Users, 
  Zap, 
  Shield, 
  Brain
} from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: "AI Conductor Mode",
      description: "Revolutionary conductor AI that orchestrates discussions between multiple agents, assigning roles and synthesizing comprehensive responses."
    },
    {
      icon: <Bot className="h-8 w-8 text-blue-600" />,
      title: "Multi-Agent AI Platform",
      description: "Chat with GPT-4, Claude, DeepSeek, Grok, and Gemini simultaneously in one unified interface."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-green-600" />,
      title: "Four Conversation Modes",
      description: "Conductor mode for orchestrated AI, Discussion mode for collaboration, Isolated mode for independent responses, and Side-by-Side for focused comparison."
    },
    {
      icon: <Users className="h-8 w-8 text-orange-600" />,
      title: "AI Collaboration",
      description: "Watch AI agents discuss, debate, and build upon each other's ideas in real-time conversations."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Free Mode Conversations",
      description: "Automated multi-round discussions between AI agents without manual intervention."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Secure & Private",
      description: "Encrypted API key storage and secure token-based usage with transparent pricing."
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
        <p className="text-muted-foreground text-lg">Everything you need for advanced AI conversations and conductor-orchestrated discussions</p>
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
