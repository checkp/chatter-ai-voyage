
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const CTASection: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center bg-primary/5 rounded-2xl p-10 md:p-14 border border-border/40">
      <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4 tracking-tight">
        Try it with your own question
      </h2>
      <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
        Free to start, no credit card. Bring a real problem — research, a draft, a decision — and watch
        eight frontier models work it through together.
      </p>
      <Button
        size="lg"
        variant="default"
        onClick={handleGetStarted}
        className="px-10 py-6 text-base font-medium"
      >
        Open RoboHeard
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

export default CTASection;
