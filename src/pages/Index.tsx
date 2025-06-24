
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

  // Send message function
  const handleSendMessage = (message: string, platformIds?: string[]) => {
    if (!activeChatId) {
      toast.error('No active chat selected');
      return;
    }
    
    sendMessageMutation.mutate({
      chatId: activeChatId,
      userMessage: message
    });
  };

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

  const renderMainContent = () => {
    if (showWelcome) {
      return (
        <WelcomeScreen
          onCreateChat={(title: string) => {
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
          onUpdatePlatformSettings={() => {}}
          onTogglePlatform={togglePlatform}
          onUpdateAgentOrder={(reorderedPlatforms: AIPlatform[]) => updateAgentOrder(reorderedPlatforms)}
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
          onSendMessage={(message: string, platformId: string) => handleSendMessage(message, [platformId])}
          activeAIStatuses={transformActiveAIStatuses(activeAIStatuses)}
        />
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <ChatMessages 
            messages={messages || []} 
            isLoadingMessages={isLoadingMessages}
            isLoadingResponse={sendMessageMutation.isPending}
            platforms={platforms}
          />
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          isLoadingResponse={sendMessageMutation.isPending}
          isPending={sendMessageMutation.isPending}
        />
      </div>
    );
  };

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
        onUpdateAgentOrder={(reorderedPlatforms: AIPlatform[]) => updateAgentOrder(reorderedPlatforms)}
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
          {renderMainContent()}
        </main>
      </div>

      {activeTab === 'chat' && activeChatId && (
        <DraggableAIStatusBar
          platforms={platforms}
          activeAIStatuses={transformActiveAIStatuses(activeAIStatuses)}
          onReorder={(reorderedPlatforms: AIPlatform[]) => updateAgentOrder(reorderedPlatforms)}
        />
      )}
    </div>
  );
};

export default Index;
