
import React from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, ArrowLeft } from 'lucide-react';

const MobileComingSoon = () => {
  const handleBackToDesktop = () => {
    // Force desktop view by setting a flag in localStorage
    localStorage.setItem('forceDesktopView', 'true');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <Smartphone className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Mobile Support Coming Soon!
          </h1>
          <p className="text-muted-foreground">
            We're working hard to bring you the best mobile experience for RoboHeard. 
            In the meantime, please use a desktop or tablet for the full experience.
          </p>
        </div>

        <div className="space-y-4">
          <img 
            src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png" 
            alt="RoboHeard Logo" 
            className="w-32 h-auto mx-auto object-contain opacity-50"
          />
          
          <Button 
            onClick={handleBackToDesktop}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue to Desktop View
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Stay tuned for updates on our mobile app launch!</p>
        </div>
      </div>
    </div>
  );
};

export default MobileComingSoon;
