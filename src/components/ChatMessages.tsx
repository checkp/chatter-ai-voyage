
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import ImagePanel from '@/components/chat/ImagePanel';
import { IMAGE_PANEL_PLATFORM, type ImagePanelData } from '@/config/imageModels';
import type { Message, AIPlatform } from '@/types/chat';

interface ChatMessagesProps {
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  isLoadingResponse: boolean;
  platforms: AIPlatform[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoadingMessages,
  isLoadingResponse,
  platforms
}) => {
  const endRef = useAutoScroll([messages?.length, isLoadingResponse]);

  const getPlatformName = (platformId: string) => {
    return platforms.find(p => p.id === platformId)?.name || platformId;
  };

  if (isLoadingMessages) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="w-80 h-9" />
        <Skeleton className="w-64 h-9" />
        <Skeleton className="w-96 h-9" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
        <p className="text-muted-foreground mb-4">Send a message to begin chatting with AI assistants</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className={`mb-4 flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
          <div className={`max-w-3xl rounded-lg p-4 text-sm ${message.sender === 'user'
            ? 'bg-primary text-primary-foreground'
            : `bg-card border-l-4 ${message.platform ? 
                message.platform === 'openai' ? 'border-l-[#8FBC8F] bg-[#8FBC8F]/5' :
                message.platform === 'anthropic' ? 'border-l-[#98D982] bg-[#98D982]/5' :
                message.platform === 'deepseek' ? 'border-l-[#87CEEB] bg-[#87CEEB]/5' :
                message.platform === 'grok' ? 'border-l-[#DDA0DD] bg-[#DDA0DD]/5' :
                'border-l-border bg-muted/50'
              : 'border-l-border bg-muted/50'}`
            }`}>
            <div className="whitespace-pre-wrap leading-relaxed text-card-foreground">
              {message.content}
            </div>
            {message.sender === 'ai' && message.platform && (
              <div className={`mt-2 text-xs font-medium ${
                message.platform === 'openai' ? 'text-[#6B8E6B]' :
                message.platform === 'anthropic' ? 'text-[#7AC464]' :
                message.platform === 'deepseek' ? 'text-[#69B7CD]' :
                message.platform === 'grok' ? 'text-[#C082C0]' :
                'text-muted-foreground'
              }`}>
                — {getPlatformName(message.platform)}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(message.created_at).toLocaleTimeString()}
          </div>
        </div>
      ))}
      {isLoadingResponse && (
        <div className="flex flex-col items-start mb-4">
          <div className="bg-card rounded-lg p-4 text-sm border-l-4 border-l-amber-400 bg-amber-50/30">
            <div className="flex items-center gap-2 text-card-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              AI assistants are responding...
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} className="h-1" />
    </>
  );
};

export default ChatMessages;
