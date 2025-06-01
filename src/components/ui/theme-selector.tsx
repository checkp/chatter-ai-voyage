
import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { themes } from '@/types/theme';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="modern-btn-secondary gap-2"
        >
          <Palette className="w-4 h-4" />
          Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="modern-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle className="modern-text-primary text-xl font-bold">
            Choose Your Theme
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-6">
          {themes.map((themeOption) => (
            <Card
              key={themeOption.id}
              className={`modern-card cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                theme === themeOption.id ? 'modern-card-selected' : ''
              }`}
              onClick={() => {
                setTheme(themeOption.id);
                setOpen(false);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold modern-text-primary">
                    {themeOption.name}
                  </h3>
                  {theme === themeOption.id && (
                    <Check className="w-5 h-5 modern-text-accent" />
                  )}
                </div>
                <p className="text-sm modern-text-muted mb-4">
                  {themeOption.description}
                </p>
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: themeOption.preview.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: themeOption.preview.secondary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: themeOption.preview.background }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
