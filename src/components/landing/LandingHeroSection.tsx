
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingHeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 pt-6 pb-10 md:pt-10 md:pb-14 text-center">
      <div className="max-w-4xl mx-auto">
        <Badge variant="outline" className="mb-4">
          <Sparkles className="mr-2 h-4 w-4" />
          2026 — The Age of Agentic AI
        </Badge>

        {/* Huge Launch button — above the fold, impossible to miss */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="text-2xl md:text-3xl font-bold px-12 py-8 md:px-16 md:py-10 h-auto rounded-2xl shadow-2xl hover:scale-105 transition-transform bg-gradient-to-r from-primary via-purple-600 to-blue-600 text-white"
          >
            Launch
            <ArrowRight className="ml-3 h-7 w-7 md:h-8 md:w-8" />
          </Button>
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            or see it in action
          </button>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
          Orchestrate the World's Best AI Models
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          The first platform where a <strong>Conductor AI</strong> orchestrates real-time debates between
          GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, Mistral, and Perplexity — turning seven frontier models into one collaborative super-intelligence.
        </p>
      </div>
    </section>
  );
};

export default LandingHeroSection;
