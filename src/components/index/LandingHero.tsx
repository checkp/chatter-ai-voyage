
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const LandingHero: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  const handleWatchDemo = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center max-w-4xl mx-auto mb-16">
      <img 
        src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png" 
        alt="RoboHeard Logo" 
        className="w-full max-w-2xl h-auto object-contain mx-auto mb-8"
      />
      <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
        Where AI Minds 
        <span className="text-primary"> Collaborate</span>
      </h1>
      <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
        Experience the future of AI interaction. Watch ChatGPT, Claude, Grok, Gemini, and DeepSeek 
        work together, building on each other's ideas in real-time conversations.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          size="lg"
          onClick={handleGetStarted}
          className="text-lg px-8 py-6"
        >
          Start Collaborating
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="lg"
          onClick={handleWatchDemo}
          className="text-lg px-8 py-6"
        >
          Watch Demo
        </Button>
      </div>
    </div>
  );
};

export default LandingHero;
