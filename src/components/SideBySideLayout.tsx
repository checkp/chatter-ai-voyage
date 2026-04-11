import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Grid3X3, Eye, EyeOff } from 'lucide-react';
import ChatMessages from '@/components/ChatMessages';
import type { Message, AIPlatform } from '@/types/chat';

interface SideBySideLayoutProps {
  enabledPlatforms: AIPlatform[];
  messages: Message[] | undefined;
  isLoadingResponse: boolean;
  activeAIStatuses: Record<string, boolean>;
  onTogglePlatform: (platformId: string) => void;
  chatMode: 'side-by-side' | 'discussion-side-by-side';
  isolatedMode: boolean;
}

const SideBySideLayout: React.FC<SideBySideLayoutProps> = ({
  enabledPlatforms,
  messages,
  isLoadingResponse,
  activeAIStatuses,
  onTogglePlatform,
  chatMode,
  isolatedMode
}) => {
  const visiblePlatforms = enabledPlatforms.filter(p => p.enabled);
  
  if (visiblePlatforms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No agents enabled for side-by-side mode</p>
          <p className="text-sm">Enable some agents in settings to see them here</p>
        </div>
      </div>
    );
  }

  const safeMessages = messages || [];

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-4 h-full p-4" style={{ minWidth: `${visiblePlatforms.length * 340}px` }}>
        {visiblePlatforms.map((platform) => {
          let agentMessages = safeMessages;
          
          if (isolatedMode || chatMode === 'side-by-side') {
            agentMessages = safeMessages.filter(msg => 
              msg.sender === 'user' || msg.platform === platform.id
            );
          }

          return (
            <div key={platform.id} className="flex flex-col h-full border rounded-lg bg-background w-80 flex-shrink-0">
              {/* Agent Header */}
              <div className={`p-3 border-b ${platform.color} flex items-center justify-between flex-shrink-0`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{platform.icon}</span>
                  <span className="font-medium text-white">{platform.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTogglePlatform(platform.id)}
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  >
                    {platform.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  {activeAIStatuses[platform.id] && (
                    <Badge variant="secondary" className="text-xs animate-pulse">
                      Responding...
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs text-white border-white/20">
                    {agentMessages.filter(m => m.platform === platform.id).length}
                  </Badge>
                </div>
              </div>

              {/* Agent Messages - independent vertical scroll */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4">
                <ChatMessages
                  messages={agentMessages}
                  isLoadingMessages={false}
                  isLoadingResponse={isLoadingResponse && activeAIStatuses[platform.id]}
                  platforms={[platform]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SideBySideLayout;
