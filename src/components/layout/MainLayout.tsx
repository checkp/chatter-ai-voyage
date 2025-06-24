
import React from 'react';
import ChatHeader from '@/components/ChatHeader';
import ChatSidebar from '@/components/ChatSidebar';
import MainContentRenderer from '@/components/MainContentRenderer';
import StatusBarManager from '@/components/StatusBarManager';
import type { AIPlatform } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface MainLayoutProps {
  // Chat Header props
  chats: any;
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
  onUpdateAgentOrder: (platforms: AIPlatform[]) => Promise<void>;
  onSignOut: () => void;
  currentChatMode: any;
  isolatedMode: boolean;
  onChatModeChange: (mode: any) => void;
  onIsolatedModeToggle: (isolated: boolean) => void;
  onTogglePlatform: (platformId: string) => Promise<void>;
  conductorPlatform: string | null;
  onConductorPlatformChange: (platformId: string | null) => void;

  // Chat Sidebar props
  setActiveChatId: (chatId: string | null) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isLoadingChats: boolean;
  isCreatingChat: boolean;

  // Main Content props
  showWelcome: boolean;
  activeChatMode: any;
  conductorPlatformObj: AIPlatform | undefined;
  conductorMessages: any[];
  isLoadingConductor: boolean;
  sendConductorMessage: (content: string) => void;
  messages: any[] | undefined;
  isLoadingMessages: boolean;
  sendMessageMutation: any;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  createChatMutation: any;
  setShowWelcome: (show: boolean) => void;
  togglePlatform: (platformId: string) => Promise<void>;
  updateAgentOrder: (platforms: AIPlatform[]) => Promise<void>;
  handleSendMessage: (message: string, platformIds?: string[]) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
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
  conductorPlatform,
  onConductorPlatformChange,
  setActiveChatId,
  onCreateChat,
  onDeleteChat,
  isLoadingChats,
  isCreatingChat,
  showWelcome,
  activeChatMode,
  conductorPlatformObj,
  conductorMessages,
  isLoadingConductor,
  sendConductorMessage,
  messages,
  isLoadingMessages,
  sendMessageMutation,
  input,
  setInput,
  handleSend,
  createChatMutation,
  setShowWelcome,
  togglePlatform,
  updateAgentOrder,
  handleSendMessage
}) => {
  return (
    <div className="h-screen flex flex-col bg-background">
      <ChatHeader
        chats={chats}
        activeChatId={activeChatId}
        activeAIStatuses={activeAIStatuses}
        platforms={platforms}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isFreeMode={isFreeMode}
        isFreeModeRunning={isFreeModeRunning}
        freeModeMessageLimit={freeModeMessageLimit}
        freeModeMessageCount={freeModeMessageCount}
        onStartFreeMode={onStartFreeMode}
        onStopFreeMode={onStopFreeMode}
        onUpdateFreeModeLimit={onUpdateFreeModeLimit}
        onSendSingleAgentMessage={onSendSingleAgentMessage}
        onUpdateAgentOrder={onUpdateAgentOrder}
        onSignOut={onSignOut}
        currentChatMode={currentChatMode}
        isolatedMode={isolatedMode}
        onChatModeChange={onChatModeChange}
        onIsolatedModeToggle={onIsolatedModeToggle}
        onTogglePlatform={onTogglePlatform}
        conductorPlatform={conductorPlatform}
        onConductorPlatformChange={onConductorPlatformChange}
      />

      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          onCreateChat={onCreateChat}
          onDeleteChat={onDeleteChat}
          isLoadingChats={isLoadingChats}
          isCreatingChat={isCreatingChat}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <MainContentRenderer
            showWelcome={showWelcome}
            activeTab={activeTab}
            activeChatMode={activeChatMode}
            conductorPlatformObj={conductorPlatformObj}
            conductorMessages={conductorMessages}
            isLoadingConductor={isLoadingConductor}
            sendConductorMessage={sendConductorMessage}
            platforms={platforms}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            sendMessageMutation={sendMessageMutation}
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            createChatMutation={createChatMutation}
            setShowWelcome={setShowWelcome}
            togglePlatform={togglePlatform}
            updateAgentOrder={updateAgentOrder}
            user={user}
            handleSendMessage={handleSendMessage}
            activeAIStatuses={activeAIStatuses}
            isolatedMode={isolatedMode}
          />
        </main>
      </div>

      <StatusBarManager
        activeTab={activeTab}
        activeChatId={activeChatId}
        platforms={platforms}
        activeAIStatuses={activeAIStatuses}
        updateAgentOrder={updateAgentOrder}
      />
    </div>
  );
};

export default MainLayout;
