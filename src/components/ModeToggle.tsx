
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export const ModeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleDarkMode = () => {
    if (theme === 'amber-dark') {
      setTheme('amber-warm');
    } else {
      setTheme('amber-dark');
    }
  };

  const isDarkMode = theme === 'amber-dark';

  return (
    <Button variant="outline" size="icon" onClick={toggleDarkMode}>
      {isDarkMode ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
};
