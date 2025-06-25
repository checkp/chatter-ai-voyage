
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Chat, ChatMode } from '@/types/chat';

interface ChatTitleSectionProps {
  activeChat: Chat | undefined;
  currentChatMode: ChatMode;
  isolatedMode: boolean;
}

const ChatTitleSection: React.FC<ChatTitleSectionProps> = ({
  activeChat,
  currentChatMode,
  isolatedMode
}) => {
  const truncatedTitle = activeChat?.title ? 
    (activeChat.title.length > 30 ? `${activeChat.title.substring(0, 30)}...` : activeChat.title) 
    : 'RoboHeard';

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <h1 className="text-lg font-semibold text-foreground truncate cursor-help">
            {truncatedTitle}
          </h1>
        </TooltipTrigger>
        <TooltipContent>
          <p>{activeChat?.title || 'RoboHeard'}</p>
        </TooltipContent>
      </Tooltip>
      
      {activeChat && (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {currentChatMode} {isolatedMode && '• isolated'}
        </Badge>
      )}
    </div>
  );
};

export default ChatTitleSection;
