
import React from 'react';
import { Link } from 'react-router-dom';

const LandingFooter = () => {
  return (
    <footer className="border-t bg-secondary/50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img
              src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png"
              alt="RoboHeard"
              className="h-6 w-6"
            />
            <span className="font-semibold">RoboHeard</span>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="/whats-new" className="text-muted-foreground hover:text-foreground transition-colors">
              What's new
            </Link>
            <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">
              Help
            </Link>
            <Link to="/purchase" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>

          <p className="text-muted-foreground text-xs text-center md:text-right">
            © 2026 RoboHeard
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
