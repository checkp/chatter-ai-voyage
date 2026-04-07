
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold mb-6">Stop Prompting One Model at a Time</h2>
        <p className="text-xl text-muted-foreground mb-8">
          In 2026, the smartest teams let AI models collaborate. Launch Conductor Mode and turn seven frontier models 
          into a single orchestrated super-intelligence — free to start.
        </p>
        <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-12 py-6">
          Start Orchestrating — Free
          <Sparkles className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};

export default LandingCTASection;
