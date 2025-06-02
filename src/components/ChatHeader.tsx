
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Settings, RefreshCw } from 'lucide-react';
import FreeModeControls from '@/components/FreeModeControls';
import type { Chat, AIPlatform } from '@/types/chat';

interface ChatHeaderProps {
  chats: Chat[] | undefined;
  activeChatId: string | null;
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  platforms: AIPlatform[];
  activeTab: 'chat' | 'settings';
  setActiveTab: (tab: 'chat' | 'settings') => void;
  user: any;
  // Free mode props
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  onStartFreeMode: () => void;
  onStopFreeMode: () => void;
  onUpdateFreeModeLimit: (limit: number) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chats,
  activeChatId,
  activeAIStatuses,
  platforms,
  activeTab,
  setActiveTab,
  user,
  isFreeMode,
  isFreeModeRunning,
  freeModeMessageLimit,
  freeModeMessageCount,
  onStartFreeMode,
  onStopFreeMode,
  onUpdateFreeModeLimit
}) => {
  const getPlatformName = (platformId: string) => {
    return platforms.find(p => p.id === platformId)?.name || platformId;
  };

  const getPlatformColor = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return 'bg-gray-500';
    
    switch (platformId) {
      case 'openai':
        return 'modern-bg-agent-openai';
      case 'anthropic':
        return 'modern-bg-agent-anthropic';
      case 'deepseek':
        return 'modern-bg-agent-deepseek';
      case 'grok':
        return 'modern-bg-agent-grok';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <header className="border-b bg-secondary border-border p-4 flex items-center justify-between flex-shrink-0">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">
            {chats?.find(chat => chat.id === activeChatId)?.title || 'Select a chat'}
          </h1>
          
          {/* Free Mode Controls */}
          {activeTab === 'chat' && (
            <FreeModeControls
              isFreeMode={isFreeMode}
              isFreeModeRunning={isFreeModeRunning}
              freeModeMessageLimit={freeModeMessageLimit}
              freeModeMessageCount={freeModeMessageCount}
              onStart={onStartFreeMode}
              onStop={onStopFreeMode}
              onUpdateLimit={onUpdateFreeModeLimit}
            />
          )}
        </div>
        
        {/* AI Status Bar */}
        {Object.keys(activeAIStatuses).length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">AI Status:</span>
            {Object.entries(activeAIStatuses).map(([platformId, status]) => (
              <Badge 
                key={platformId}
                variant="outline"
                className={`text-xs ${
                  status === 'thinking' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                  status === 'responding' ? `${getPlatformColor(platformId)} text-white border-transparent` :
                  status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                  'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                {getPlatformName(platformId)}: {status}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setActiveTab(activeTab === 'chat' ? 'settings' : 'chat')}
        >
          {activeTab === 'chat' ? <Settings className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
        <Avatar>
          <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} />
          <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default ChatHeader;
