
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';

const LandingHero: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center max-w-4xl mx-auto mb-8 md:mb-16">
      {/* HUGE Launch button — above the fold, first thing on / */}
      <div className="flex flex-col items-center gap-3 mb-6 md:mb-8">
        <Button
          size="lg"
          onClick={handleGetStarted}
          className="text-2xl md:text-3xl font-bold px-12 py-7 md:px-16 md:py-9 h-auto rounded-2xl shadow-2xl hover:scale-105 transition-transform bg-gradient-to-r from-primary via-purple-600 to-blue-600 text-white w-full sm:w-auto"
        >
          Launch
          <ArrowRight className="ml-3 h-7 w-7 md:h-8 md:w-8" />
        </Button>
        <button
          onClick={handleGetStarted}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          or see it in action
        </button>
      </div>

      {/* Logo only on mobile — desktop shows it in the side-by-side layout */}
      <img
        src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png"
        alt="RoboHeard Logo"
        className="md:hidden w-full max-w-[200px] sm:max-w-xs h-auto object-contain mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => window.location.href = '/auth'}
      />

      <Badge variant="outline" className="mb-4 md:mb-6 text-primary border-primary/20">
        <Sparkles className="mr-2 h-4 w-4" />
        2026 — Agentic AI Is Here
      </Badge>

      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
        Seven Frontier Models,
        <span className="text-primary"> One Conductor</span>
      </h1>

      <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed px-4 md:px-0">
        Our <strong>Conductor AI</strong> orchestrates GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, Mistral, and Perplexity
        in real-time debates — seven frontier models as one collaborative super-intelligence.
      </p>
    </div>
  );
};


export default LandingHero;
