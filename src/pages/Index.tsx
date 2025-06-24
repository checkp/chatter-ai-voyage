
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useConductorChat } from '@/hooks/useConductorChat';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useFreeMode } from '@/hooks/useFreeMode';
import { useUIState } from '@/hooks/useUIState';
import AuthPage from '@/components/AuthPage';
import WelcomeScreen from '@/components/WelcomeScreen';
import ChatHeader from '@/components/ChatHeader';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import ConductorChat from '@/components/ConductorChat';
import SettingsPanel from '@/components/SettingsPanel';
import SideBySideLayout from '@/components/SideBySideLayout';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import MobileInterface from '@/components/mobile/MobileInterface';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import type { AIPlatform, ChatMode } from '@/types/chat';

const Index = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { platforms, updatePlatformSettings, togglePlatform, updateAgentOrder } = usePlatforms(user);
  
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
    sendMessage,
    callAIAPI
  } = useMessageHandling(user, activeChatId, platforms);

  const conductorPlatformObj = platforms.find(p => p.id === conductorPlatform);

  const {
    conductorMessages,
    isLoadingConductor,
    sendConductorMessage,
    resetConductorChat
  } = useConductorChat(user, conductorPlatformObj, activeChatId, callAIAPI);

  const {
    isFreeMode,
    isFreeModeRunning,
    freeModeMessageCount,
    freeModeMessageLimit,
    startFreeMode,
    stopFreeMode,
    updateFreeModeLimit
  } = useFreeMode();

  const {
    activeTab,
    setActiveTab,
    showWelcome,
    setShowWelcome
  } = useUIState();

  // Handle chat mode changes
  const handleChatModeChange = async (mode: ChatMode) => {
    if (!activeChatId) {
      toast.error('No active chat selected');
      return;
    }

    try {
      await updateChatModeMutation.mutateAsync({ chatId: activeChatId, chatMode: mode });
      
      // Reset conductor chat when switching modes
      if (mode !== 'conductor') {
        resetConductorChat();
      }
      
      // Switch to appropriate tab
      if (mode === 'conductor') {
        setActiveTab('conductor');
      } else {
        setActiveTab('chat');
      }
    } catch (error) {
      console.error('Failed to change chat mode:', error);
    }
  };

  // Handle conductor platform selection
  const handleConductorPlatformChange = async (platformId: string | null) => {
    if (!activeChatId) {
      toast.error('No active chat selected');
      return;
    }

    try {
      await updateConductorPlatformMutation.mutateAsync({ 
        chatId: activeChatId, 
        conductorPlatform: platformId 
      });
    } catch (error) {
      console.error('Failed to update conductor platform:', error);
    }
  };

  // Handle isolated mode toggle
  const handleIsolatedModeToggle = async (isolated: boolean) => {
    if (!activeChatId) {
      toast.error('No active chat selected');
      return;
    }

    try {
      await updateIsolatedModeMutation.mutateAsync({ chatId: activeChatId, isolatedMode: isolated });
    } catch (error) {
      console.error('Failed to toggle isolated mode:', error);
    }
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
  }, [user, isInitialLoadComplete, chats, setShowWelcome]);

  if (!user) {
    return <AuthPage />;
  }

  if (isMobile) {
    return (
      <MobileInterface
        user={user}
        platforms={platforms}
        chats={chats}
        messages={messages}
        activeChatId={activeChatId}
        activeAIStatuses={activeAIStatuses}
        onSendMessage={sendMessage}
        onCreateChat={(title) => createChatMutation.mutate({ title })}
        onDeleteChat={(chatId) => deleteChatMutation.mutate(chatId)}
        onSelectChat={setActiveChatId}
        onSignOut={signOut}
        onTogglePlatform={togglePlatform}
        onUpdatePlatformSettings={updatePlatformSettings}
      />
    );
  }

  const renderMainContent = () => {
    if (showWelcome) {
      return (
        <WelcomeScreen
          onDismiss={() => setShowWelcome(false)}
          onCreateChat={(title) => {
            createChatMutation.mutate({ title });
            setShowWelcome(false);
          }}
        />
      );
    }

    if (activeTab === 'settings') {
      return (
        <SettingsPanel
          platforms={platforms}
          onUpdatePlatformSettings={updatePlatformSettings}
          onTogglePlatform={togglePlatform}
          onUpdateAgentOrder={updateAgentOrder}
          user={user}
        />
      );
    }

    if (activeTab === 'conductor' && activeChatMode === 'conductor') {
      return (
        <ConductorChat
          conductorPlatform={conductorPlatformObj}
          messages={conductorMessages}
          isLoading={isLoadingConductor}
          onSendMessage={sendConductorMessage}
        />
      );
    }

    if (activeChatMode === 'side-by-side') {
      return (
        <SideBySideLayout
          platforms={platforms}
          onSendMessage={(message, platformId) => sendMessage(message, [platformId])}
          activeAIStatuses={activeAIStatuses}
        />
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <ChatMessages 
            messages={messages || []} 
            isLoading={isLoadingMessages}
            platforms={platforms}
          />
        </div>
        <ChatInput
          onSendMessage={sendMessage}
          platforms={platforms}
          disabled={!activeChatId}
          isolatedMode={isolatedMode}
          chatMode={activeChatMode}
        />
      </div>
    );
  };

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
        onStartFreeMode={startFreeMode}
        onStopFreeMode={stopFreeMode}
        onUpdateFreeModeLimit={updateFreeModeLimit}
        onSendSingleAgentMessage={(message, platformId) => sendMessage(message, [platformId])}
        onUpdateAgentOrder={updateAgentOrder}
        onSignOut={signOut}
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
          onSelectChat={setActiveChatId}
          onCreateChat={(title) => createChatMutation.mutate({ title })}
          onDeleteChat={(chatId) => deleteChatMutation.mutate(chatId)}
          isLoading={isLoadingChats}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {renderMainContent()}
        </main>
      </div>

      {activeTab === 'chat' && activeChatId && (
        <DraggableAIStatusBar
          platforms={platforms}
          activeStatuses={activeAIStatuses}
          onUpdateOrder={updateAgentOrder}
        />
      )}
    </div>
  );
};

export default Index;
