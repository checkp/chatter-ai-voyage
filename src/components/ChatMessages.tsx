import React, { useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import ImagePanel from '@/components/chat/ImagePanel';
import MarkdownMessage from '@/components/chat/MarkdownMessage';
import { IMAGE_PANEL_PLATFORM, type ImagePanelData } from '@/config/imageModels';
import { useFunTheme } from '@/contexts/FunThemeContext';
import { themeToCssVars, bubbleVariant } from '@/lib/funTheme';
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
  const { enabled: funEnabled, theme: funTheme, notifyMessages } = useFunTheme();

  // Fire fun-mode theme generation when a new assistant message arrives.
  useEffect(() => {
    notifyMessages(messages);
  }, [messages, notifyMessages]);

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

  const funActive = funEnabled && !!funTheme;
  const wrapperStyle: React.CSSProperties = funActive ? {
    ...themeToCssVars(funTheme!),
    padding: '12px',
    borderRadius: '12px',
    transition: 'background-color 600ms ease, color 600ms ease',
  } : {};

  const userBubbleStyle: React.CSSProperties | undefined = funActive ? {
    background: 'var(--fun-user-bg)',
    color: 'var(--fun-user-fg)',
    borderRadius: 'var(--fun-radius)',
    boxShadow: 'var(--fun-shadow)',
    borderLeft: 'none',
    fontFamily: 'var(--fun-font-body)',
    transition: 'all 500ms ease',
  } : undefined;

  const aiBubbleStyle: React.CSSProperties | undefined = funActive ? {
    background: 'var(--fun-ai-bg)',
    color: 'var(--fun-ai-fg)',
    borderLeft: '4px solid var(--fun-accent)',
    borderRadius: 'var(--fun-radius)',
    boxShadow: 'var(--fun-shadow)',
    fontFamily: 'var(--fun-font-body)',
    transition: 'all 500ms ease',
  } : undefined;

  return (
    <div style={wrapperStyle} data-fun={funActive ? 'on' : 'off'}>
      {messages.map((message) => (
        <div key={message.id} className={`mb-4 flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
          {message.platform === IMAGE_PANEL_PLATFORM ? (() => {
            try {
              const data = JSON.parse(message.content) as ImagePanelData;
              return <ImagePanel data={data} />;
            } catch {
              return <div className="text-xs text-destructive">Failed to render image panel</div>;
            }
          })() : (
            <div
              style={message.sender === 'user' ? userBubbleStyle : aiBubbleStyle}
              className={funActive ? 'max-w-3xl p-4 text-sm' : `max-w-3xl rounded-lg p-4 text-sm ${message.sender === 'user'
                ? 'bg-primary text-primary-foreground'
                : `bg-card border-l-4 ${message.platform ?
                    message.platform === 'openai' ? 'border-l-[#8FBC8F] bg-[#8FBC8F]/5' :
                    message.platform === 'anthropic' ? 'border-l-[#98D982] bg-[#98D982]/5' :
                    message.platform === 'deepseek' ? 'border-l-[#87CEEB] bg-[#87CEEB]/5' :
                    message.platform === 'grok' ? 'border-l-[#DDA0DD] bg-[#DDA0DD]/5' :
                    'border-l-border bg-muted/50'
                  : 'border-l-border bg-muted/50'}`
                }`}>
              {message.sender === 'ai' ? (
                <MarkdownMessage content={message.content} />
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed" style={funActive ? { color: 'var(--fun-user-fg)' } : undefined}>
                  {message.content}
                </div>
              )}
              {message.sender === 'ai' && message.platform && (
                <div
                  className={funActive ? 'mt-2 text-xs font-medium opacity-80' : `mt-2 text-xs font-medium ${
                    message.platform === 'openai' ? 'text-[#6B8E6B]' :
                    message.platform === 'anthropic' ? 'text-[#7AC464]' :
                    message.platform === 'deepseek' ? 'text-[#69B7CD]' :
                    message.platform === 'grok' ? 'text-[#C082C0]' :
                    'text-muted-foreground'
                  }`}
                  style={funActive ? { color: 'var(--fun-accent)' } : undefined}
                >
                  — {getPlatformName(message.platform)}
                </div>
              )}
            </div>
          )}
          <div className="text-xs mt-1" style={funActive ? { color: 'var(--fun-ai-fg)', opacity: 0.6 } : undefined}>
            {!funActive && <span className="text-muted-foreground">{new Date(message.created_at).toLocaleTimeString()}</span>}
            {funActive && <span>{new Date(message.created_at).toLocaleTimeString()}</span>}
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
    </div>
  );
};

export default ChatMessages;
