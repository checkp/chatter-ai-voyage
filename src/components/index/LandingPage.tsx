
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHero from './LandingHero';
import FeaturesGrid from './FeaturesGrid';
import AITestimonials from './AITestimonials';
import CTASection from './CTASection';
import ConductorShowcase from './ConductorShowcase';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Sticky mobile header with login */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" 
            alt="RoboHeard" 
            className="h-7 w-7" 
          />
          <span className="font-bold text-lg">RoboHeard</span>
        </div>
        <Button size="sm" onClick={() => navigate('/auth')}>
          Login <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </header>
      <div className="container mx-auto px-4 py-8 md:py-16">
        <LandingHero />
        <ConductorShowcase />
        <FeaturesGrid />
        <AITestimonials />
        <CTASection />
      </div>
    </div>
  );
};

export default LandingPage;
