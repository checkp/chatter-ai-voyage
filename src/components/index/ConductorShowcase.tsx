
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Users, Zap, Target, ArrowRight, Sparkles } from 'lucide-react';

const ConductorShowcase: React.FC = () => {
  const conductorFeatures = [
    {
      icon: Brain,
      title: "AI Orchestration",
      description: "Watch our Conductor AI intelligently coordinate conversations between GPT-4, Claude, DeepSeek, Grok, and Gemini for comprehensive insights."
    },
    {
      icon: Users,
      title: "Multi-Agent Collaboration",
      description: "Experience unprecedented AI teamwork where each model builds upon others' responses, creating richer and more nuanced solutions."
    },
    {
      icon: Target,
      title: "Focused Discussions",
      description: "The Conductor keeps conversations productive and on-track, ensuring you get actionable results from every AI interaction."
    },
    {
      icon: Zap,
      title: "Real-time Analysis",
      description: "Get instant summaries and direction from the Conductor as it analyzes conversation flow and suggests next steps."
    }
  ];

  const aiExperiences = [
    {
      scenario: "Problem Solving",
      description: "Present a complex challenge and watch GPT-4 analyze, Claude provide ethical considerations, DeepSeek offer technical depth, while the Conductor synthesizes everything into actionable solutions.",
      badge: "Multi-Perspective"
    },
    {
      scenario: "Creative Projects",
      description: "Brainstorm ideas with Gemini's creativity, refine them with Grok's wit, validate with Claude's reasoning, all while the Conductor ensures every angle is explored.",
      badge: "Creative Flow"
    },
    {
      scenario: "Research & Analysis",
      description: "Deep-dive into topics with each AI contributing their unique strengths - from DeepSeek's technical analysis to GPT-4's comprehensive overviews.",
      badge: "Research Mode"
    }
  ];

  return (
    <section className="mb-20">
      {/* Main Conductor Introduction */}
      <div className="text-center mb-16">
        <Badge variant="outline" className="mb-4 text-primary border-primary/20">
          <Brain className="mr-2 h-4 w-4" />
          Introducing Conductor AI
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          The Future of AI Collaboration
        </h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Experience the revolutionary Conductor mode where an AI orchestrator coordinates 
          discussions between multiple AI models, creating unprecedented collaborative intelligence.
        </p>
      </div>

      {/* Conductor Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {conductorFeatures.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="p-2 rounded-lg bg-primary/10 w-fit mb-2">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Experiences Section */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">New AI Experiences</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover how Conductor AI transforms your interactions with multiple AI models
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {aiExperiences.map((experience, index) => (
            <Card key={index} className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm hover:from-card/80 hover:to-card/50 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl">{experience.scenario}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {experience.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">
                  {experience.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8">
        <h3 className="text-2xl font-bold mb-4">Ready to Experience Conductor AI?</h3>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Join the revolution in AI collaboration and discover what's possible when multiple AI minds work together under intelligent orchestration.
        </p>
        <Button size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/auth'}>
          Try Conductor Mode
          <Sparkles className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};

export default ConductorShowcase;
