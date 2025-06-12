
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MessageCircle, Users, Grid3X3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ChatMode } from '@/types/chat';

interface ChatModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  className?: string;
}

const ChatModeSelector: React.FC<ChatModeSelectorProps> = ({
  currentMode,
  onModeChange,
  className = ''
}) => {
  const isMobile = useIsMobile();

  const modes = [
    {
      value: 'discussion' as ChatMode,
      label: 'Discussion',
      icon: Users,
      description: 'Agents see all messages'
    },
    {
      value: 'isolated' as ChatMode,
      label: 'Isolated',
      icon: MessageCircle,
      description: 'Each agent only sees user messages'
    },
    {
      value: 'side-by-side' as ChatMode,
      label: 'Side-by-Side',
      icon: Grid3X3,
      description: 'Separate windows (desktop only)',
      disabled: isMobile
    }
  ];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">Mode:</span>
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
              {mode.disabled && currentMode === mode.value && (
                <Badge variant="secondary" className="text-xs ml-1">Isolated</Badge>
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
};

export default ChatModeSelector;
