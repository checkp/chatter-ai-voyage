
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
    return (saved as ThemeVariant) || 'amber-warm';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme: ThemeVariant = prev === 'amber-warm' ? 'blue-cool' : 'amber-warm';
      return newTheme;
    });
  };

  useEffect(() => {
    console.log('Setting theme to:', theme);
    localStorage.setItem('chat-theme', theme);
    
    // Apply theme to document element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also apply dark class for amber-dark theme
    if (theme === 'amber-dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
