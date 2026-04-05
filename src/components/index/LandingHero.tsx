
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Brain, Eye } from 'lucide-react';

const LandingHero: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  const handleWatchDemo = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center max-w-4xl mx-auto mb-8 md:mb-16">
      <img 
        src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png" 
        alt="RoboHeard Logo" 
        className="w-full max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl h-auto object-contain mx-auto mb-4 md:mb-6 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => window.location.href = '/auth'}
      />
      
      <Badge variant="outline" className="mb-4 md:mb-6 text-primary border-primary/20">
        <Brain className="mr-2 h-4 w-4" />
        Now with AI Conductor Mode
      </Badge>
      
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
        Where AI Minds 
        <span className="text-primary"> Collaborate</span>
      </h1>
      
      <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed px-4 md:px-0">
        Experience the future of AI interaction with our revolutionary <strong>Conductor AI</strong>. 
        Watch GPT-5, ChatGPT, Claude, Grok-4, Grok, Gemini, and DeepSeek work together under intelligent 
        orchestration, building on each other's ideas in real-time conversations.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0">
        <Button 
          size="lg"
          onClick={handleGetStarted}
          className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6"
        >
          Experience Conductor AI
          <Brain className="ml-2 h-4 md:h-5 w-4 md:w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="lg"
          onClick={handleWatchDemo}
          className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6"
        >
          Watch Demo
          <Eye className="ml-2 h-4 md:h-5 w-4 md:w-5" />
        </Button>
      </div>
    </div>
  );
};

export default LandingHero;
