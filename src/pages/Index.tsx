import React, { useEffect, useRef } from 'react';
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
import WelcomeScreen from '@/components/WelcomeScreen';
import MobileLayout from '@/components/mobile/MobileLayout';
import MobileInterface from '@/components/mobile/MobileInterface';
import LandingPage from '@/components/index/LandingPage';
import DesktopInterface from '@/components/index/DesktopInterface';
import type { ChatMode } from '@/types/chat';

const Index = () => {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
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
  
  const { hasCompletedOnboarding, isLoading: isLoadingOnboarding, completeOnboarding, skipOnboarding } = useOnboarding(user);

  const {
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    activeChatMode,
    isolatedMode,
    setActiveChatId,
    createChatMutation,
    updateChatModeMutation,
    updateIsolatedModeMutation,
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
  } = useMessageHandling(user, platforms, callAIAPI, activeChatMode);

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

  // Refs for tracking state changes
  const previousMessageCountRef = useRef(0);
  const previousActiveTabRef = useRef('chat');

  // Helper functions
  const handleDeleteChat = (chatId: string) => {
    deleteChatMutation.mutate(chatId);
  };

  const handleCreateChat = (chatMode: ChatMode = 'discussion') => {
    createChatMutation.mutate({ title: 'New Chat', chatMode });
  };

  const handleChatModeChange = (mode: ChatMode) => {
    if (!activeChatId) return;
    
    // On mobile, side-by-side mode falls back to discussion
    const effectiveMode = isMobile && mode === 'side-by-side' ? 'discussion' : mode;
    
    updateChatModeMutation.mutate({ 
      chatId: activeChatId, 
      chatMode: effectiveMode 
    });
  };

  const handleIsolatedModeToggle = (isolated: boolean) => {
    if (!activeChatId) return;
    
    updateIsolatedModeMutation.mutate({
      chatId: activeChatId,
      isolatedMode: isolated
    });
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

  // Transform activeAIStatuses to match expected type - converting from boolean to specific status strings
  const transformedStatuses = Object.entries(activeAIStatuses).reduce((acc, [key, value]) => {
    acc[key] = value ? 'responding' : 'completed';
    return acc;
  }, {} as Record<string, 'thinking' | 'responding' | 'completed' | 'error'>);

  // Get current chat with messages
  const currentChatWithMessages = React.useMemo(() => {
    const foundChat = chats?.find(chat => chat.id === activeChatId);
    if (!foundChat) return null;
    
    const chatWithMessages = {
      ...foundChat,
      messages: messages || []
    };
    
    return chatWithMessages;
  }, [chats, activeChatId, messages]);

  // Set up scroll listener when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      const cleanup = setupScrollListener();
      return cleanup;
    }
  }, [activeTab, setupScrollListener]);

  useEffect(() => {
    if (previousActiveTabRef.current === 'chat' && activeTab !== 'chat') {
      saveScrollPosition();
    }
    
    if (previousActiveTabRef.current !== 'chat' && activeTab === 'chat' && lastScrollPosition !== null) {
      setTimeout(() => {
        restoreScrollPosition();
      }, 100);
    }
    
    previousActiveTabRef.current = activeTab;
  }, [activeTab, saveScrollPosition, restoreScrollPosition, lastScrollPosition]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const hasNewMessages = messages.length > previousMessageCountRef.current;
      
      if (hasNewMessages && activeTab === 'chat') {
        if (!isUserScrolledUp) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
      
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, scrollToBottom, isUserScrolledUp, activeTab]);

  useEffect(() => {
    if (messages && !isLoadingMessages && activeChatId && activeTab === 'chat') {
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

  // NOW ALL CONDITIONAL LOGIC AND EARLY RETURNS COME AFTER ALL HOOKS
  
  // Show loading while auth is being determined
  if (loading || isLoadingOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show enhanced landing page if not authenticated
  if (!user) {
    return <LandingPage />;
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

  const DesktopInterfaceComponent = (
    <DesktopInterface
      chats={chats}
      isLoadingChats={isLoadingChats}
      activeChatId={activeChatId}
      setActiveChatId={setActiveChatId}
      handleCreateChat={handleCreateChat}
      handleDeleteChat={handleDeleteChat}
      createChatMutation={createChatMutation}
      messages={messages}
      isLoadingMessages={isLoadingMessages}
      isLoadingResponse={isLoadingResponse}
      platforms={platforms}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      isFreeMode={isFreeMode}
      isFreeModeRunning={isFreeModeRunning}
      freeModeMessageLimit={freeModeMessageLimit}
      freeModeMessageCount={freeModeMessageCount}
      handleStartFreeMode={handleStartFreeMode}
      stopFreeMode={stopFreeMode}
      updateMessageLimit={updateMessageLimit}
      handleSingleAgentMessage={handleSingleAgentMessage}
      updateAgentOrder={updateAgentOrder}
      handleSignOut={handleSignOut}
      activeChatMode={activeChatMode}
      isolatedMode={isolatedMode}
      handleChatModeChange={handleChatModeChange}
      handleIsolatedModeToggle={handleIsolatedModeToggle}
      togglePlatform={togglePlatform}
      transformedStatuses={transformedStatuses}
      currentChatWithMessages={currentChatWithMessages}
      scrollAreaRef={scrollAreaRef}
      messagesEndRef={messagesEndRef}
      input={input}
      setInput={setInput}
      handleSend={handleSend}
      handleStop={handleStop}
      sendMessageMutation={sendMessageMutation}
      canStop={canStop}
      getPendingCount={getPendingCount}
      handleSendAndStartConversation={handleSendAndStartConversation}
      callAIAPI={callAIAPI}
    />
  );

  const MobileInterfaceComponent = <MobileInterface />;

  return (
    <MobileLayout fallback={MobileInterfaceComponent}>
      {DesktopInterfaceComponent}
    </MobileLayout>
  );
};

export default Index;
