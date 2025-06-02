
import React, { useEffect, useRef } from 'react';
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
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';

const Index = () => {
  const { user, loading, handleSignOut } = useAuth();
  const { theme } = useTheme();
  const { platforms, togglePlatform, callAIAPI, reloadSettings } = usePlatforms(user);
  const { messagesEndRef, scrollAreaRef, scrollToBottom, scrollToBottomImmediate } = useScrollToBottom();
  const previousMessageCountRef = useRef(0);

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

  // Handle scrolling when messages change
  useEffect(() => {
    if (messages && messages.length > previousMessageCountRef.current) {
      // New messages added - ensure scroll happens after render
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      previousMessageCountRef.current = messages.length;
    } else if (messages) {
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, scrollToBottom]);

  // Handle initial scroll when chat loads or changes
  useEffect(() => {
    if (messages && !isLoadingMessages && activeChatId) {
      // Chat loaded - scroll to bottom after content is rendered
      setTimeout(() => {
        scrollToBottomImmediate();
      }, 200);
    }
  }, [activeChatId, isLoadingMessages, messages, scrollToBottomImmediate]);

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

  // Find the current chat object for AIStatusBar
  const currentChat = chats?.find(chat => chat.id === activeChatId);

  // Show loading while auth is being determined
  if (loading) {
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
        <h1 className="text-2xl font-bold mb-4">Please sign in to continue.</h1>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
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
          onSignOut={handleSignOut}
        />

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4 min-h-full flex flex-col">
                <div className="flex-1">
                  <ChatMessages 
                    messages={messages}
                    isLoadingMessages={isLoadingMessages}
                    isLoadingResponse={isLoadingResponse}
                    platforms={platforms}
                  />
                </div>
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </ScrollArea>
          )}

          {activeTab === 'settings' && (
            <div className="h-full overflow-y-auto p-4">
              <SettingsPanel />
            </div>
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
          />
        )}
      </main>
    </div>
  );
};

export default Index;
