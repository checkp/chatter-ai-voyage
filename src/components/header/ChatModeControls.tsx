
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3, Users, Shield, ShieldOff, Brain, Palette, Hammer } from 'lucide-react';
import { useFunTheme } from '@/contexts/FunThemeContext';
import type { ChatMode } from '@/types/chat';

interface ChatModeControlsProps {
  currentChatMode: ChatMode;
  isolatedMode: boolean;
  onChatModeChange: (mode: ChatMode) => void;
  onIsolatedModeToggle: (isolated: boolean) => void;
}

const ChatModeControls: React.FC<ChatModeControlsProps> = ({
  currentChatMode,
  isolatedMode,
  onChatModeChange,
  onIsolatedModeToggle
}) => {
  const { enabled: funEnabled, toggle: toggleFun, theme: funTheme } = useFunTheme();
  const getChatModeIcon = (mode: ChatMode) => {
    switch (mode) {
      case 'side-by-side': return Grid3X3;
      case 'conductor': return Brain;
      case 'build': return Hammer;
      default: return Users;
    }
  };

  const getNextMode = (current: ChatMode): ChatMode => {
    const modes: ChatMode[] = ['discussion', 'side-by-side', 'conductor', 'build'];
    const currentIndex = modes.indexOf(current);
    return modes[(currentIndex + 1) % modes.length];
  };

  const ChatModeIcon = getChatModeIcon(currentChatMode);

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChatModeChange(getNextMode(currentChatMode))}
            className="h-8 w-8 p-0"
            data-tour="chat-mode"
          >
            <ChatModeIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {getNextMode(currentChatMode).replace('-', ' ')} mode</p>
        </TooltipContent>
      </Tooltip>

      {currentChatMode !== 'conductor' && currentChatMode !== 'build' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onIsolatedModeToggle(!isolatedMode)}
              className="h-8 w-8 p-0"
              data-tour="isolated-mode"
            >
              {isolatedMode ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isolatedMode ? 'Disable' : 'Enable'} isolated mode</p>
          </TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={funEnabled ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleFun}
            className="h-8 w-8 p-0"
            aria-label="Fun mode"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{funEnabled ? `Fun mode on${funTheme?.vibe ? ` — ${funTheme.vibe}` : ''}` : 'Enable Fun mode (chat restyles itself)'}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ChatModeControls;
