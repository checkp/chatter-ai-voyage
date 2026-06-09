
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Users, Zap, Target, Sparkles } from 'lucide-react';

const ConductorShowcase: React.FC = () => {
  const conductorFeatures = [
    {
      icon: Brain,
      title: "Agentic Orchestration",
      description: "The Conductor analyses your query, assigns specialist roles to each model, and mediates the multi-turn conversation — the agentic pattern that defines 2026 AI."
    },
    {
      icon: Users,
      title: "Cross-Model Reasoning",
      description: "GPT-5's reasoning, Claude 4's analysis, DeepSeek-R2's depth and Qwen's multilingual lens combine into answers no single model can produce."
    },
    {
      icon: Target,
      title: "Conflict Resolution",
      description: "When models disagree, the Conductor highlights consensus, surfaces evidence, and produces a balanced synthesis — not just majority vote."
    },
    {
      icon: Zap,
      title: "Real-Time Summaries",
      description: "Live synthesis as agents respond. Get structured conclusions, actionable next steps, and dissenting viewpoints — all before you ask."
    }
  ];

  const aiExperiences = [
    {
      scenario: "Multi-Model Code Review",
      description: "Submit a PR and let GPT-5 catch logic bugs, Claude 4 flag security issues, DeepSeek-R2 suggest performance optimizations, while the Conductor prioritises the fixes.",
      badge: "Engineering"
    },
    {
      scenario: "Research Synthesis",
      description: "Paste a paper or topic — Gemini 2.5 extracts key claims with million-token context, Grok-4 cross-references real-time data, and the Conductor produces an annotated brief.",
      badge: "Research"
    },
    {
      scenario: "Strategic Planning",
      description: "Describe a business challenge. Each model brings a different lens — market data, risk analysis, creative strategy — orchestrated into a unified action plan.",
      badge: "Business"
    }
  ];

  return (
    <section className="mb-20">
      <div className="text-center mb-16">
        <Badge variant="outline" className="mb-4 text-primary border-primary/20">
          <Brain className="mr-2 h-4 w-4" />
          Conductor AI — Agentic Orchestration
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          The Agentic AI Workflow, Simplified
        </h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          2025 proved that multi-agent systems outperform single models on complex tasks. 
          Conductor Mode brings that research breakthrough to everyone — no infra, no code, just results.
        </p>
      </div>

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

      <div className="mb-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Real-World Use Cases</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how teams use Conductor Mode to solve problems that stump single models
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

      <div className="text-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8">
        <h3 className="text-2xl font-bold mb-4">Ready to Orchestrate?</h3>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Join thousands who moved from single-model prompting to agentic orchestration. Free to start — pay only for the tokens you use.
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
