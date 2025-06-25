
import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import FreeModeControls from '@/components/FreeModeControls';
import ConductorControls from '@/components/ConductorControls';
import ChatTitleSection from '@/components/header/ChatTitleSection';
import ChatModeControls from '@/components/header/ChatModeControls';
import TabNavigation from '@/components/header/TabNavigation';
import UserControls from '@/components/header/UserControls';
import type { Chat, ChatMode, AIPlatform } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ChatHeaderProps {
  chats: Chat[] | undefined;
  activeChatId: string | null;
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  platforms: AIPlatform[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: SupabaseUser;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  onStartFreeMode: () => void;
  onStopFreeMode: () => void;
  onUpdateFreeModeLimit: (limit: number) => void;
  onSendSingleAgentMessage: (message: string, platformId: string) => void;
  onUpdateAgentOrder: (reorderedPlatforms: AIPlatform[]) => void;
  onSignOut: () => void;
  currentChatMode: ChatMode;
  isolatedMode: boolean;
  onChatModeChange: (mode: ChatMode) => void;
  onIsolatedModeToggle: (isolated: boolean) => void;
  onTogglePlatform: (platformId: string) => void;
  // Conductor props
  conductorState?: {
    isActive: boolean;
    isAnalyzing: boolean;
    conversationCount: number;
    lastSummary: string | null;
  };
  onStartConductor?: () => void;
  onStopConductor?: () => void;
  onRequestConductorDirection?: () => void;
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
  onSignOut,
  currentChatMode,
  isolatedMode,
  onChatModeChange,
  onIsolatedModeToggle,
  onTogglePlatform,
  conductorState,
  onStartConductor,
  onStopConductor,
  onRequestConductorDirection
}) => {
  const activeChat = chats?.find(chat => chat.id === activeChatId);

  return (
    <TooltipProvider>
      <header className="flex items-center justify-between p-3 bg-background border-b border-border min-h-[60px]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ChatTitleSection 
            activeChat={activeChat}
            currentChatMode={currentChatMode}
            isolatedMode={isolatedMode}
          />

          {/* Chat Mode Controls - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && (
            <ChatModeControls
              currentChatMode={currentChatMode}
              isolatedMode={isolatedMode}
              onChatModeChange={onChatModeChange}
              onIsolatedModeToggle={onIsolatedModeToggle}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Conductor Controls - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && conductorState && onStartConductor && onStopConductor && onRequestConductorDirection && (
            <ConductorControls
              isActive={conductorState.isActive}
              isAnalyzing={conductorState.isAnalyzing}
              conversationCount={conductorState.conversationCount}
              lastSummary={conductorState.lastSummary}
              onStart={onStartConductor}
              onStop={onStopConductor}
              onRequestDirection={onRequestConductorDirection}
            />
          )}

          {/* Free Mode Controls - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && (
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

          <TabNavigation 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <UserControls
            user={user}
            onSignOut={onSignOut}
            setActiveTab={setActiveTab}
          />
        </div>
      </header>
    </TooltipProvider>
  );
};

export default ChatHeader;
