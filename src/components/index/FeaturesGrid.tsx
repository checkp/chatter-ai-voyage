
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, Zap, Bot } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: "Multi-AI Collaboration",
    description: "Watch different AI models work together, building on each other's ideas in real-time."
  },
  {
    icon: MessageSquare,
    title: "Multiple Chat Modes",
    description: "Choose from discussion, isolated, or side-by-side modes for different collaboration styles."
  },
  {
    icon: Zap,
    title: "Free Mode Conversations",
    description: "Let AIs engage in autonomous conversations while you observe and interact."
  },
  {
    icon: Bot,
    title: "5 Leading AI Models",
    description: "Access ChatGPT, Claude, Grok, Gemini, and DeepSeek all in one platform."
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
