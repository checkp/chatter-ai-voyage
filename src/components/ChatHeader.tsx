
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, X, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FreeModeControls from '@/components/FreeModeControls';
import BotHistoryDialog from '@/components/BotHistoryDialog';
import TokenBalance from '@/components/TokenBalance';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import ChangelogDialog from '@/components/ChangelogDialog';
import ChatModeSelector from '@/components/ChatModeSelector';
import type { Chat, AIPlatform, ChatMode } from '@/types/chat';

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
  // Agent reordering
  onUpdateAgentOrder?: (reorderedPlatforms: AIPlatform[]) => void;
  // Chat mode props
  currentChatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  // Logout function
  onSignOut: () => void;
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
  onSendSingleAgentMessage,
  onUpdateAgentOrder,
  currentChatMode,
  onChatModeChange,
  onSignOut
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AIPlatform | null>(null);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const navigate = useNavigate();

  const handlePurchaseClick = () => {
    navigate('/purchase');
  };

  const handleAgentClick = (platform: AIPlatform) => {
    setSelectedAgent(platform);
    setIsAgentDialogOpen(true);
  };

  const handleAgentReorder = (reorderedPlatforms: AIPlatform[]) => {
    if (onUpdateAgentOrder) {
      onUpdateAgentOrder(reorderedPlatforms);
    }
  };

  const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
  const currentChat = chats?.find(chat => chat.id === activeChatId);

  return (
    <>
      <header className="border-b bg-secondary border-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold">
                  {chats?.find(chat => chat.id === activeChatId)?.title || 'Select a chat'}
                </h1>
                
                {/* Chat Mode Selector */}
                {activeTab === 'chat' && activeChatId && (
                  <ChatModeSelector
                    currentMode={currentChatMode}
                    onModeChange={onChatModeChange}
                  />
                )}
              </div>
              
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
            
            {/* Draggable AI Agents Status */}
            {enabledPlatforms.length > 0 && (
              <DraggableAIStatusBar
                platforms={platforms}
                activeAIStatuses={activeAIStatuses}
                onReorder={handleAgentReorder}
                onAgentClick={handleAgentClick}
              />
            )}
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            {/* Token Balance */}
            {user && <TokenBalance user={user} onPurchaseClick={handlePurchaseClick} />}
            
            {/* What's New Button */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsChangelogOpen(true)}
              title="What's New?"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setActiveTab(activeTab === 'chat' ? 'settings' : 'chat')}
            >
              {activeTab === 'chat' ? <Settings className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onSignOut}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
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

      {/* Changelog Dialog */}
      <ChangelogDialog
        open={isChangelogOpen}
        onOpenChange={setIsChangelogOpen}
      />
    </>
  );
};

export default ChatHeader;
