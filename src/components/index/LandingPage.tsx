
import React from 'react';
import LandingHero from './LandingHero';
import FeaturesGrid from './FeaturesGrid';
import AITestimonials from './AITestimonials';
import CTASection from './CTASection';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <LandingHero />
        <FeaturesGrid />
        <AITestimonials />
        <CTASection />
      </div>
    </div>
  );
};

export default LandingPage;
