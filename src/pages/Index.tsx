
import React, { useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from '@/contexts/ThemeContext';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useAuth } from '@/hooks/useAuth';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useUIState } from '@/hooks/useUIState';
import { useFreeMode } from '@/hooks/useFreeMode';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useIsMobile } from '@/hooks/use-mobile';
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';
import WelcomeScreen from '@/components/WelcomeScreen';
import MobileLayout from '@/components/mobile/MobileLayout';
import MobileInterface from '@/components/mobile/MobileInterface';

const Index = () => {
  const { user, loading, handleSignOut } = useAuth();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  
  const { platforms, togglePlatform, callAIAPI, reloadSettings, updateAgentOrder } = usePlatforms(user);
  const { 
    messagesEndRef, 
    scrollAreaRef, 
    scrollToBottom, 
    scrollToBottomImmediate,
    saveScrollPosition,
    restoreScrollPosition,
    setupScrollListener,
    isUserScrolledUp,
    lastScrollPosition
  } = useScrollToBottom();
  const previousMessageCountRef = useRef(0);
  const previousActiveTabRef = useRef('chat');

  // Add onboarding hook
  const { hasCompletedOnboarding, isLoading: isLoadingOnboarding, completeOnboarding, skipOnboarding } = useOnboarding(user);

  const {
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    setActiveChatId,
    createChatMutation,
    deleteChatMutation,
    isInitialLoadComplete
  } = useChatManagement(user);

  const {
    input,
    setInput,
    isLoadingResponse,
    activeAIStatuses,
    sendMessageMutation,
    handleSend,
    handleStop,
    messageQueue,
    getPendingCount,
    canStop,
    sendSingleAgentMessage
  } = useMessageHandling(user, platforms, callAIAPI);

  const {
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab
  } = useUIState();

  const {
    isFreeMode,
    freeModeMessageLimit,
    freeModeMessageCount,
    isFreeModeRunning,
    startFreeMode,
    stopFreeMode,
    updateMessageLimit
  } = useFreeMode();

  // Set up scroll listener when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      const cleanup = setupScrollListener();
      return cleanup;
    }
  }, [activeTab, setupScrollListener]);

  // Handle tab switching with scroll position preservation
  useEffect(() => {
    // If switching from chat to another tab, save scroll position
    if (previousActiveTabRef.current === 'chat' && activeTab !== 'chat') {
      saveScrollPosition();
    }
    
    // If switching back to chat from another tab, restore scroll position if available
    if (previousActiveTabRef.current !== 'chat' && activeTab === 'chat' && lastScrollPosition !== null) {
      setTimeout(() => {
        restoreScrollPosition();
      }, 100);
    }
    
    previousActiveTabRef.current = activeTab;
  }, [activeTab, saveScrollPosition, restoreScrollPosition, lastScrollPosition]);

  // Smart scrolling for new messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      const hasNewMessages = messages.length > previousMessageCountRef.current;
      
      if (hasNewMessages && activeTab === 'chat') {
        // Only auto-scroll if user hasn't manually scrolled up or is near bottom
        if (!isUserScrolledUp) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
      
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, scrollToBottom, isUserScrolledUp, activeTab]);

  // Handle initial scroll when switching to a different chat
  useEffect(() => {
    if (messages && !isLoadingMessages && activeChatId && activeTab === 'chat') {
      // Only auto-scroll for initial chat load or when explicitly at bottom
      if (lastScrollPosition === null || !isUserScrolledUp) {
        setTimeout(() => {
          scrollToBottomImmediate();
        }, 200);
      }
    }
  }, [activeChatId, isLoadingMessages, scrollToBottomImmediate, activeTab, lastScrollPosition, isUserScrolledUp]);

  useEffect(() => {
    if (activeTab === 'chat' && user) {
      reloadSettings();
    }
  }, [activeTab, user, reloadSettings]);

  const handleDeleteChat = (chatId: string) => {
    deleteChatMutation.mutate(chatId);
  };

  const handleCreateChat = () => {
    createChatMutation.mutate('New Chat');
  };

  const handleSingleAgentMessage = async (message: string, platformId: string) => {
    if (!activeChatId) return;
    await sendSingleAgentMessage(activeChatId, message, platformId);
  };

  const handleStartFreeMode = () => {
    startFreeMode(activeChatId, platforms, callAIAPI, sendSingleAgentMessage);
  };

  const handleSendAndStartConversation = () => {
    if (!input.trim() || !activeChatId) return;
    
    // Send the message first
    handleSend(activeChatId);
    
    // Start free mode conversation after a short delay to let the message send
    setTimeout(() => {
      handleStartFreeMode();
    }, 1000);
  };

  // Handle welcome screen completion
  const handleWelcomeComplete = async () => {
    await completeOnboarding();
    // Create first chat if none exists
    if (!chats || chats.length === 0) {
      handleCreateChat();
    }
  };

  const handleWelcomeSkip = async () => {
    await skipOnboarding();
    // Create first chat if none exists
    if (!chats || chats.length === 0) {
      handleCreateChat();
    }
  };

  // Find the current chat object for AIStatusBar
  const currentChat = chats?.find(chat => chat.id === activeChatId);

  // Show loading while auth is being determined
  if (loading || isLoadingOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <img 
          src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png" 
          alt="RoboHerd Logo" 
          className="w-full max-w-2xl h-auto object-contain"
        />
        <h1 className="text-2xl font-bold mb-4">Please sign in to continue.</h1>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Sign In
        </Button>
      </div>
    );
  }

  // Show welcome screen for new users
  if (hasCompletedOnboarding === false) {
    return (
      <WelcomeScreen 
        onGetStarted={handleWelcomeComplete}
        onSkip={handleWelcomeSkip}
      />
    );
  }

  // Memoize the desktop interface to prevent unnecessary re-renders - AFTER all early returns
  const DesktopInterface = useMemo(() => (
    <div className="min-h-screen bg-background flex h-screen overflow-hidden">
      <ChatSidebar 
        chats={chats}
        isLoadingChats={isLoadingChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        isCreatingChat={createChatMutation.isPending}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">        
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
          onStartFreeMode={handleStartFreeMode}
          onStopFreeMode={stopFreeMode}
          onUpdateFreeModeLimit={updateMessageLimit}
          onSendSingleAgentMessage={handleSingleAgentMessage}
          onUpdateAgentOrder={updateAgentOrder}
          onSignOut={handleSignOut}
        />

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ScrollArea className="h-full">
              <div className="p-4">
                <ChatMessages 
                  messages={messages}
                  isLoadingMessages={isLoadingMessages}
                  isLoadingResponse={isLoadingResponse}
                  platforms={platforms}
                />
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </ScrollArea>
          )}

          {activeTab === 'settings' && (
            <ScrollArea className="h-full">
              <div className="p-4">
                <SettingsPanel />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Input */}
        {activeTab === 'chat' && (
          <ChatInput 
            input={input}
            setInput={setInput}
            handleSend={() => handleSend(activeChatId)}
            handleStop={handleStop}
            isLoadingResponse={isLoadingResponse}
            isPending={sendMessageMutation.isPending}
            canStop={canStop}
            pendingCount={getPendingCount}
            isFreeMode={isFreeMode}
            isFreeModeRunning={isFreeModeRunning}
            onSendAndStartConversation={handleSendAndStartConversation}
          />
        )}
      </main>
    </div>
  ), [
    chats,
    isLoadingChats,
    activeChatId,
    activeAIStatuses,
    platforms,
    activeTab,
    user,
    isFreeMode,
    isFreeModeRunning,
    freeModeMessageLimit,
    freeModeMessageCount,
    messages,
    isLoadingMessages,
    isLoadingResponse,
    input,
    canStop,
    sendMessageMutation.isPending,
    createChatMutation.isPending
  ]);

  // Memoize the mobile interface to prevent unnecessary re-renders - AFTER all early returns
  const MobileInterfaceComponent = useMemo(() => <MobileInterface />, []);

  return (
    <MobileLayout fallback={MobileInterfaceComponent}>
      {DesktopInterface}
    </MobileLayout>
  );
};

export default Index;
