
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3, Users, Shield, ShieldOff, Brain } from 'lucide-react';
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
  const getChatModeIcon = (mode: ChatMode) => {
    switch (mode) {
      case 'side-by-side': return Grid3X3;
      case 'conductor': return Brain;
      default: return Users;
    }
  };

  const getNextMode = (current: ChatMode): ChatMode => {
    const modes: ChatMode[] = ['discussion', 'side-by-side', 'conductor'];
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
          >
            <ChatModeIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {getNextMode(currentChatMode).replace('-', ' ')} mode</p>
        </TooltipContent>
      </Tooltip>

      {currentChatMode !== 'conductor' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onIsolatedModeToggle(!isolatedMode)}
              className="h-8 w-8 p-0"
            >
              {isolatedMode ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isolatedMode ? 'Disable' : 'Enable'} isolated mode</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default ChatModeControls;
