
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
        return <Clock className="w-3 h-3 text-cyber-muted animate-pulse" />;
      case 'sent':
        return <Send className="w-3 h-3 text-cyber-primary" />;
      case 'seen':
        return <Eye className="w-3 h-3 text-cyber-accent" />;
      default:
        return <Send className="w-3 h-3 text-cyber-primary" />;
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
        <div className="flex items-center gap-1 cursor-pointer">
          {getStatusIcon()}
          {seenByPlatforms.length > 0 && (
            <span className="text-xs text-cyber-muted">{seenByPlatforms.length}</span>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 bg-cyber-surface border-cyber-primary/30">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-cyber-text">Message Status</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-cyber-text capitalize">{message.status || 'sent'}</span>
            </div>
            {seenByPlatforms.length > 0 && (
              <div>
                <p className="text-xs text-cyber-muted mb-1">Seen by:</p>
                <div className="flex flex-wrap gap-1">
                  {seenByPlatforms.map(platform => (
                    <Badge 
                      key={platform!.id} 
                      variant="outline" 
                      className="text-xs border-cyber-primary/50"
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
