
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3, Users, Shield, ShieldOff } from 'lucide-react';
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
    return mode === 'side-by-side' ? Grid3X3 : Users;
  };

  const ChatModeIcon = getChatModeIcon(currentChatMode);

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextMode = currentChatMode === 'discussion' ? 'side-by-side' : 'discussion';
              onChatModeChange(nextMode);
            }}
            className="h-8 w-8 p-0"
          >
            <ChatModeIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {currentChatMode === 'discussion' ? 'side-by-side' : 'discussion'} mode</p>
        </TooltipContent>
      </Tooltip>

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
    </div>
  );
};

export default ChatModeControls;
