
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useConductorChat } from '@/hooks/useConductorChat';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useFreeMode } from '@/hooks/useFreeMode';
import { useUIState } from '@/hooks/useUIState';
import { useEventHandlers } from '@/components/EventHandlers';
import AuthPage from '@/components/AuthPage';
import ChatHeader from '@/components/ChatHeader';
import ChatSidebar from '@/components/ChatSidebar';
import MainContentRenderer from '@/components/MainContentRenderer';
import StatusBarManager from '@/components/StatusBarManager';
import MobileInterface from '@/components/mobile/MobileInterface';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import type { AIPlatform } from '@/types/chat';

const Index = () => {
  const { user, handleSignOut } = useAuth();
  const isMobile = useIsMobile();
  const { platforms, togglePlatform, updateAgentOrder } = usePlatforms(user);
  
  const {
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    activeChatMode,
    isolatedMode,
    conductorPlatform,
    setActiveChatId,
    setActiveChatMode,
    setIsolatedMode,
    setConductorPlatform,
    createChatMutation,
    updateChatModeMutation,
    updateIsolatedModeMutation,
    updateConductorPlatformMutation,
    deleteChatMutation,
    isInitialLoadComplete
  } = useChatManagement(user);

  const {
    activeAIStatuses,
    sendMessageMutation
  } = useMessageHandling(user, activeChatId, platforms);

  const conductorPlatformObj = platforms.find(p => p.id === conductorPlatform);

  const {
    conductorMessages,
    isLoadingConductor,
    sendConductorMessage,
    resetConductorChat
  } = useConductorChat(user, conductorPlatformObj, activeChatId, platforms);

  const {
    isFreeMode,
    isFreeModeRunning,
    freeModeMessageCount,
    freeModeMessageLimit,
    startFreeMode,
    stopFreeMode,
    updateMessageLimit
  } = useFreeMode();

  const {
    activeTab,
    setActiveTab
  } = useUIState();

  const [showWelcome, setShowWelcome] = useState(false);
  const [input, setInput] = useState('');

  // Event handlers
  const {
    handleChatModeChange,
    handleConductorPlatformChange,
    handleIsolatedModeToggle,
    handleSendMessage
  } = useEventHandlers(
    activeChatId,
    updateChatModeMutation,
    updateConductorPlatformMutation,
    updateIsolatedModeMutation,
    sendMessageMutation,
    setActiveTab,
    resetConductorChat
  );

  // Send function for ChatInput
  const handleSend = () => {
    if (!input.trim()) return;
    handleSendMessage(input.trim());
    setInput('');
  };

  // Convert boolean statuses to proper type
  const transformActiveAIStatuses = (statuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>): Record<string, 'thinking' | 'responding' | 'completed' | 'error'> => {
    return statuses;
  };

  // Auto-create first chat if none exists
  useEffect(() => {
    if (isInitialLoadComplete && user && (!chats || chats.length === 0)) {
      createChatMutation.mutate({ title: 'New Conversation' });
    }
  }, [isInitialLoadComplete, user, chats, createChatMutation]);

  // Show welcome screen for new users
  useEffect(() => {
    if (user && isInitialLoadComplete && (!chats || chats.length === 0)) {
      setShowWelcome(true);
    }
  }, [user, isInitialLoadComplete, chats]);

  if (!user) {
    return <AuthPage />;
  }

  if (isMobile) {
    return <MobileInterface />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <ChatHeader
        chats={chats}
        activeChatId={activeChatId}
        activeAIStatuses={transformActiveAIStatuses(activeAIStatuses)}
        platforms={platforms}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isFreeMode={isFreeMode}
        isFreeModeRunning={isFreeModeRunning}
        freeModeMessageLimit={freeModeMessageLimit}
        freeModeMessageCount={freeModeMessageCount}
        onStartFreeMode={() => {
          if (activeChatId) {
            startFreeMode(activeChatId, platforms, () => {}, () => {});
          }
        }}
        onStopFreeMode={stopFreeMode}
        onUpdateFreeModeLimit={updateMessageLimit}
        onSendSingleAgentMessage={(message: string, platformId: string) => handleSendMessage(message, [platformId])}
        onUpdateAgentOrder={updateAgentOrder}
        onSignOut={handleSignOut}
        currentChatMode={activeChatMode}
        isolatedMode={isolatedMode}
        onChatModeChange={handleChatModeChange}
        onIsolatedModeToggle={handleIsolatedModeToggle}
        onTogglePlatform={togglePlatform}
        conductorPlatform={conductorPlatform}
        onConductorPlatformChange={handleConductorPlatformChange}
      />

      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          onCreateChat={() => createChatMutation.mutate({ title: 'New Conversation' })}
          onDeleteChat={(chatId: string) => deleteChatMutation.mutate(chatId)}
          isLoadingChats={isLoadingChats}
          isCreatingChat={createChatMutation.isPending}
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
            activeAIStatuses={transformActiveAIStatuses(activeAIStatuses)}
          />
        </main>
      </div>

      <StatusBarManager
        activeTab={activeTab}
        activeChatId={activeChatId}
        platforms={platforms}
        activeAIStatuses={transformActiveAIStatuses(activeAIStatuses)}
        updateAgentOrder={updateAgentOrder}
      />
    </div>
  );
};

export default Index;
