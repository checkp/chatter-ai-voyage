
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingHeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="max-w-4xl mx-auto">
        <Badge variant="outline" className="mb-4">
          <Brain className="mr-2 h-4 w-4" />
          AI Conductor Platform
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
          Train Your AI Army
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
          Revolutionary conversation platform with AI Conductor mode. Watch our conductor AI orchestrate 
          discussions between GPT-4, Claude, DeepSeek, Grok, and Gemini for comprehensive insights and solutions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8 py-6">
            Experience AI Conductor
            <Brain className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8 py-6">
            View Demo
            <Eye className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default LandingHeroSection;
