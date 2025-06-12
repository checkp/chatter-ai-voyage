
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MessageCircle, Users, Grid3X3, Layout } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ChatMode } from '@/types/chat';

interface ChatModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  isolatedMode: boolean;
  onIsolatedToggle: (isolated: boolean) => void;
  className?: string;
}

const ChatModeSelector: React.FC<ChatModeSelectorProps> = ({
  currentMode,
  onModeChange,
  isolatedMode,
  onIsolatedToggle,
  className = ''
}) => {
  const isMobile = useIsMobile();

  const modes = [
    {
      value: 'discussion' as ChatMode,
      label: 'Discussion',
      icon: Users,
      description: 'Standard chat view'
    },
    {
      value: 'side-by-side' as ChatMode,
      label: 'Side-by-Side',
      icon: Grid3X3,
      description: 'Separate windows (desktop only)',
      disabled: isMobile
    },
    {
      value: 'discussion-side-by-side' as ChatMode,
      label: 'Discussion S×S',
      icon: Layout,
      description: 'Discussion in separate windows (desktop only)',
      disabled: isMobile
    }
  ];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">View:</span>
        <ToggleGroup 
          type="single" 
          value={currentMode} 
          onValueChange={(value) => value && onModeChange(value as ChatMode)}
          className="gap-1"
        >
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <ToggleGroupItem 
                key={mode.value} 
                value={mode.value}
                disabled={mode.disabled}
                className="flex items-center gap-2 px-3 py-2 text-sm"
                title={mode.description}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        <Switch 
          id="isolated-mode" 
          checked={isolatedMode}
          onCheckedChange={onIsolatedToggle}
        />
        <Label htmlFor="isolated-mode" className="text-sm font-medium text-muted-foreground cursor-pointer">
          Isolated
        </Label>
      </div>
    </div>
  );
};

export default ChatModeSelector;
