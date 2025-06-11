
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Grid3X3 } from 'lucide-react';
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
      description: 'Agents see all messages and can build on each other\'s responses'
    },
    {
      value: 'isolated' as ChatMode,
      label: 'Isolated',
      icon: MessageCircle,
      description: 'Each agent only sees user messages and their own responses'
    },
    {
      value: 'side-by-side' as ChatMode,
      label: 'Side-by-Side',
      icon: Grid3X3,
      description: 'Isolated mode with separate windows (desktop only)',
      disabled: isMobile
    }
  ];

  const currentModeInfo = modes.find(mode => mode.value === currentMode);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={currentMode} onValueChange={onModeChange}>
        <SelectTrigger className="w-48">
          <SelectValue>
            <div className="flex items-center gap-2">
              {currentModeInfo && <currentModeInfo.icon className="h-4 w-4" />}
              <span>{currentModeInfo?.label}</span>
              {isMobile && currentMode === 'side-by-side' && (
                <Badge variant="secondary" className="text-xs">Isolated</Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <SelectItem 
                key={mode.value} 
                value={mode.value}
                disabled={mode.disabled}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{mode.label}</span>
                    {mode.disabled && <Badge variant="outline" className="text-xs">Desktop Only</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{mode.description}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChatModeSelector;
