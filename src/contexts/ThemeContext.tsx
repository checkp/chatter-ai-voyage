
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ThemeVariant } from '@/types/theme';

interface ThemeContextType {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeVariant>(() => {
    const saved = localStorage.getItem('chat-theme');
    return (saved as ThemeVariant) || 'blue-cool'; // Default to system-like theme
  });

  const toggleTheme = () => {
    setTheme(prev => {
      // Cycle through: system -> light -> dark -> system
      if (prev === 'blue-cool') {
        return 'amber-warm';
      } else if (prev === 'amber-warm') {
        return 'amber-dark';
      } else {
        return 'blue-cool';
      }
    });
  };

  useEffect(() => {
    localStorage.setItem('chat-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
