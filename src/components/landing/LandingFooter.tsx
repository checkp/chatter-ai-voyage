
import React from 'react';

const LandingFooter = () => {
  return (
    <footer className="border-t bg-secondary/50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img 
              src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" 
              alt="RoboHeard" 
              className="h-6 w-6" 
            />
            <span className="font-semibold">RoboHeard</span>
          </div>
          <p className="text-muted-foreground text-center">
            © 2026 RoboHeard. Agentic AI orchestration — Conductor Mode for multi-model collaboration.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
