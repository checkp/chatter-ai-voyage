
import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export const ModeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Cycle through: system -> light -> dark -> system
    if (theme === 'amber-warm') {
      setTheme('amber-dark');
    } else if (theme === 'amber-dark') {
      setTheme('blue-cool'); // system-like default
    } else {
      setTheme('amber-warm');
    }
  };

  const getIcon = () => {
    if (theme === 'amber-dark') {
      return <Sun className="h-4 w-4" />;
    } else if (theme === 'amber-warm') {
      return <Moon className="h-4 w-4" />;
    } else {
      return <Monitor className="h-4 w-4" />;
    }
  };

  const getTooltipText = () => {
    if (theme === 'amber-dark') {
      return 'Switch to Light Mode';
    } else if (theme === 'amber-warm') {
      return 'Switch to Dark Mode';
    } else {
      return 'Switch to System Theme';
    }
  };

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      title={getTooltipText()}
      className="bg-white/70 hover:bg-white/90 border-green-200/50"
    >
      {getIcon()}
      <span className="sr-only">{getTooltipText()}</span>
    </Button>
  );
};
