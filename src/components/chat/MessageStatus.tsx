
import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, Send } from 'lucide-react';
import type { Message, AIPlatform } from '@/types/chat';

interface MessageStatusProps {
  message: Message;
  platforms: AIPlatform[];
}

const MessageStatus: React.FC<MessageStatusProps> = ({ message, platforms }) => {
  if (message.sender === 'user') return null;

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-pastel-muted animate-pulse" />;
      case 'sent':
        return <Send className="w-3 h-3 text-pastel-primary" />;
      case 'seen':
        return <Eye className="w-3 h-3 text-pastel-accent" />;
      default:
        return <Send className="w-3 h-3 text-pastel-primary" />;
    }
  };

  const getSeenByPlatforms = () => {
    if (!message.seenBy) return [];
    return message.seenBy.map(platformId => 
      platforms.find(p => p.id === platformId)
    ).filter(Boolean);
  };

  const seenByPlatforms = getSeenByPlatforms();

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer hover:scale-110 transition-transform duration-200">
          {getStatusIcon()}
          {seenByPlatforms.length > 0 && (
            <span className="text-xs text-pastel-muted bg-pastel-surface/50 px-1 rounded-full">{seenByPlatforms.length}</span>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 bg-pastel-surface border-pastel-primary/30 shadow-xl">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-pastel-text">Message Status</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-pastel-text capitalize">{message.status || 'sent'}</span>
            </div>
            {seenByPlatforms.length > 0 && (
              <div>
                <p className="text-xs text-pastel-muted mb-2">Seen by:</p>
                <div className="flex flex-wrap gap-1">
                  {seenByPlatforms.map(platform => (
                    <Badge 
                      key={platform!.id} 
                      variant="outline" 
                      className={`text-xs border shadow-sm ${
                        platform!.id === 'openai' ? 'border-agent-openai text-agent-openai' :
                        platform!.id === 'anthropic' ? 'border-agent-anthropic text-agent-anthropic' :
                        platform!.id === 'deepseek' ? 'border-agent-deepseek text-agent-deepseek' :
                        platform!.id === 'grok' ? 'border-agent-grok text-agent-grok' :
                        'border-pastel-primary/50 text-pastel-primary'
                      }`}
                    >
                      {platform!.icon} {platform!.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default MessageStatus;
