import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Settings, RefreshCw, Bot, Brain, Search, Zap } from 'lucide-react';
import FreeModeControls from '@/components/FreeModeControls';
import BotHistoryDialog from '@/components/BotHistoryDialog';
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
  // Single agent messaging
  onSendSingleAgentMessage?: (message: string, platformId: string) => void;
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
  onUpdateFreeModeLimit,
  onSendSingleAgentMessage
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AIPlatform | null>(null);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);

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

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return Bot;
      case 'anthropic':
        return Brain;
      case 'deepseek':
        return Search;
      case 'grok':
        return Zap;
      default:
        return Bot;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'thinking':
        return 'bg-yellow-400';
      case 'responding':
        return 'bg-blue-400';
      case 'completed':
        return 'bg-green-400';
      case 'error':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusAnimation = (status: string) => {
    switch (status) {
      case 'thinking':
        return 'animate-pulse';
      case 'responding':
        return 'animate-ping';
      case 'completed':
        return '';
      case 'error':
        return 'animate-bounce';
      default:
        return '';
    }
  };

  const handleAgentClick = (platform: AIPlatform) => {
    setSelectedAgent(platform);
    setIsAgentDialogOpen(true);
  };

  const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
  const currentChat = chats?.find(chat => chat.id === activeChatId);

  return (
    <>
      <header className="border-b bg-secondary border-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
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
            
            {/* AI Agents Status - Always Visible */}
            {enabledPlatforms.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">AI Agents:</span>
                <div className="flex items-center gap-3 flex-wrap">
                  {enabledPlatforms.map((platform) => {
                    const status = activeAIStatuses[platform.id] || 'idle';
                    const Icon = getPlatformIcon(platform.id);
                    
                    return (
                      <div key={platform.id} className="flex items-center gap-2">
                        <div className="relative">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <div 
                            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(status)} ${getStatusAnimation(status)}`}
                          />
                        </div>
                        <Badge 
                          variant="outline"
                          className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                            status === 'thinking' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                            status === 'responding' ? `${getPlatformColor(platform.id)} text-white border-transparent` :
                            status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                            status === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
                            'text-muted-foreground'
                          }`}
                          onClick={() => handleAgentClick(platform)}
                        >
                          {platform.name}: {status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 ml-4">
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
        </div>
      </header>

      {/* Agent Chat Dialog */}
      <BotHistoryDialog
        open={isAgentDialogOpen}
        onOpenChange={setIsAgentDialogOpen}
        platform={selectedAgent}
        currentChat={currentChat || null}
        onSendMessage={onSendSingleAgentMessage}
      />
    </>
  );
};

export default ChatHeader;
