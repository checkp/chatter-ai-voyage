
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const CTASection: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center bg-primary/5 rounded-2xl p-12">
      <h2 className="text-3xl font-bold text-foreground mb-4">
        Stop Prompting Alone — Start Orchestrating
      </h2>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
        In 2026, the smartest teams let seven frontier models debate, challenge, and refine each other's ideas. 
        Conductor Mode makes multi-agent collaboration as easy as sending a single message.
      </p>
      <Button 
        size="lg"
        onClick={handleGetStarted}
        className="text-lg px-12 py-6"
      >
        Get Started Free
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
};

export default CTASection;
