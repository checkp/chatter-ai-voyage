
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHero from './LandingHero';
import FeaturesGrid from './FeaturesGrid';
import AITestimonials from './AITestimonials';
import CTASection from './CTASection';
import ConductorShowcase from './ConductorShowcase';
import DemoChat from './DemoChat';
import SheepBubbles from './SheepBubbles';
import UseCases from './UseCases';

import LandingFooter from '@/components/landing/LandingFooter';
import { Link } from 'react-router-dom';


const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Sticky mobile header with login */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <img
            src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png"
            alt="RoboHeard AI model orchestrator logo"
            width={28}
            height={28}
            className="h-7 w-7"
          />

          <span className="font-bold text-lg">RoboHeard</span>
        </div>
        <Button size="sm" onClick={() => navigate('/auth')}>
          Login <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </header>

      {/* Desktop top nav — quiet, text-only */}
      <nav className="hidden md:flex items-center justify-end gap-6 px-8 pt-4 text-sm h-12">
        <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">
          Features
        </Link>
        <Link to="/whats-new" className="text-muted-foreground hover:text-foreground transition-colors">
          What's new
        </Link>
        <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">
          Help
        </Link>
        <Link to="/auth" className="text-foreground font-medium hover:text-primary transition-colors">
          Sign in
        </Link>
      </nav>

      {/* FIRST FOLD — guaranteed to fit on a normal-height screen.
          Desktop: hero (with Start) on the left, logo on the right.
          Mobile: hero stacks naturally and includes its own mobile logo. */}



      <section className="container mx-auto px-4 md:min-h-[calc(100svh-3.5rem)] md:flex md:items-center py-4 md:py-0">
        <div className="w-full grid md:grid-cols-2 md:gap-10 items-center">
          <div className="min-w-0">
            <LandingHero />
          </div>
          <div className="hidden md:flex items-center justify-center relative min-w-0">
            <img
              src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png"
              alt="RoboHeard AI model orchestrator logo"
              width={560}
              height={560}
              fetchPriority="high"
              className="w-auto max-w-full max-h-[min(70svh,560px)] object-contain cursor-pointer hover-scale hover:brightness-110 transition-all duration-300"
              onClick={() => navigate('/auth')}
            />

            <SheepBubbles />
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-12">
        {/* Demo chat — moved below the fold so the Start button is always visible first */}
        <DemoChat />

        <ConductorShowcase />
        <UseCases />
        <FeaturesGrid />
        <AITestimonials />
        <CTASection />
      </main>
      <LandingFooter />
    </div>

  );
};

export default LandingPage;
