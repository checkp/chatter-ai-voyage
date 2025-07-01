
import React from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHeroSection from '@/components/landing/LandingHeroSection';
import AIModelsSection from '@/components/landing/AIModelsSection';
import ChatModesSection from '@/components/landing/ChatModesSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import LandingCTASection from '@/components/landing/LandingCTASection';
import LandingFooter from '@/components/landing/LandingFooter';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/50 to-background">
      <LandingHeader />
      <LandingHeroSection />
      <AIModelsSection />
      <ChatModesSection />
      <FeaturesSection />
      <LandingCTASection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
