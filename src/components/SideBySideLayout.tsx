
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Grid3X3 } from 'lucide-react';
import ChatMessages from '@/components/ChatMessages';
import type { Message, AIPlatform } from '@/types/chat';

interface AgentWindowProps {
  platform: AIPlatform;
  messages: Message[];
  isLoadingResponse: boolean;
  activeAIStatuses: Record<string, boolean>;
}

const AgentWindow: React.FC<AgentWindowProps> = ({
  platform,
  messages,
  isLoadingResponse,
  activeAIStatuses
}) => {
  // Filter messages for this specific agent (user messages + this agent's responses)
  const agentMessages = messages.filter(msg => 
    msg.sender === 'user' || msg.platform === platform.id
  );

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background">
      {/* Agent Header */}
      <div className={`p-3 border-b ${platform.color} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{platform.icon}</span>
          <span className="font-medium text-white">{platform.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {activeAIStatuses[platform.id] && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Responding...
            </Badge>
          )}
          <Badge variant="outline" className="text-xs text-white border-white/20">
            {agentMessages.filter(m => m.platform === platform.id).length} responses
          </Badge>
        </div>
      </div>

      {/* Agent Messages */}
      <ScrollArea className="flex-1 p-4">
        <ChatMessages
          messages={agentMessages}
          isLoadingMessages={false}
          isLoadingResponse={isLoadingResponse && activeAIStatuses[platform.id]}
          platforms={[platform]}
        />
      </ScrollArea>
    </div>
  );
};

interface SideBySideLayoutProps {
  enabledPlatforms: AIPlatform[];
  messages: Message[];
  isLoadingResponse: boolean;
  activeAIStatuses: Record<string, boolean>;
}

const SideBySideLayout: React.FC<SideBySideLayoutProps> = ({
  enabledPlatforms,
  messages,
  isLoadingResponse,
  activeAIStatuses
}) => {
  const activePlatforms = enabledPlatforms.filter(p => p.enabled);
  
  if (activePlatforms.length === 0) {
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

  return (
    <div className={`grid gap-4 h-full p-4 grid-cols-${Math.min(activePlatforms.length, 4)}`}>
      {activePlatforms.map((platform) => (
        <AgentWindow
          key={platform.id}
          platform={platform}
          messages={messages}
          isLoadingResponse={isLoadingResponse}
          activeAIStatuses={activeAIStatuses}
        />
      ))}
    </div>
  );
};

export default SideBySideLayout;
