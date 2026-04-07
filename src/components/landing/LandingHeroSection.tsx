
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingHeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="max-w-4xl mx-auto">
        <Badge variant="outline" className="mb-4">
          <Sparkles className="mr-2 h-4 w-4" />
          2026 — The Age of Agentic AI
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
          Orchestrate the World's Best AI Models
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
          The first platform where a <strong>Conductor AI</strong> orchestrates real-time debates between 
          GPT-5, Claude 4, Gemini 2.5, Grok-4, and DeepSeek-R2 — turning seven frontier models into one collaborative super-intelligence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8 py-6">
            Launch Conductor Mode
            <Brain className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8 py-6">
            See It in Action
            <Eye className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default LandingHeroSection;
