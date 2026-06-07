
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const LandingHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" 
            alt="RoboHeard" 
            className="h-8 w-8" 
          />
          <span className="text-2xl font-bold">RoboHeard</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/help">
              <HelpCircle className="mr-2 h-4 w-4" /> Help
            </Link>
          </Button>
          <Button onClick={() => navigate('/auth')}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
