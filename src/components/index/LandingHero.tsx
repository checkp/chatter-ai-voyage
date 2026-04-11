
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, Sparkles } from 'lucide-react';

const LandingHero: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center max-w-4xl mx-auto mb-8 md:mb-16">
      {/* Logo only on mobile — desktop shows it in the side-by-side layout */}
      <img 
        src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png" 
        alt="RoboHeard Logo" 
        className="md:hidden w-full max-w-xs sm:max-w-md h-auto object-contain mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity"
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
        Our <strong>Conductor AI</strong> orchestrates GPT-5, Claude 4, Gemini 2.5, Grok-4, and DeepSeek-R2 
        in real-time debates — collaborative super-intelligence at your fingertips.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
        <Button 
          size="lg"
          onClick={handleGetStarted}
          className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6"
        >
          Launch Conductor Mode
          <Brain className="ml-2 h-4 md:h-5 w-4 md:w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="lg"
          onClick={handleGetStarted}
          className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6"
        >
          See It in Action
          <Eye className="ml-2 h-4 md:h-5 w-4 md:w-5" />
        </Button>
      </div>
    </div>
  );
};

export default LandingHero;
