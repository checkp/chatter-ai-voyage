
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold mb-6">Ready to Experience AI Conductor?</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Join thousands of users who are experiencing the power of conductor-orchestrated AI conversations 
          and multi-agent collaboration.
        </p>
        <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-12 py-6">
          Start Your AI Journey
          <Sparkles className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};

export default LandingCTASection;
