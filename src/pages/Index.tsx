
import React, { useMemo, useEffect } from 'react';
import { useIndexHooks } from '@/hooks/useIndexHooks';
import { useScrollEffects } from '@/hooks/useScrollEffects';
import { createIndexHandlers } from '@/utils/indexHandlers';
import LandingPage from '@/components/index/LandingPage';
import WelcomeHandlers from '@/components/index/WelcomeHandlers';
import IndexLayout from '@/components/index/IndexLayout';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  // Initialize all hooks
  const hooks = useIndexHooks();

  // Create handlers
  const handlers = useMemo(() => createIndexHandlers(
    hooks.deleteChatMutation,
    hooks.createChatMutation,
    hooks.updateChatModeMutation,
    hooks.updateIsolatedModeMutation,
    hooks.sendSingleAgentMessage,
    hooks.activeChatId,
    hooks.isMobile,
    hooks.platforms,
    hooks.callAIAPI,
    hooks.startFreeMode,
    hooks.handleSend,
    hooks.input
  ), [
    hooks.deleteChatMutation,
    hooks.createChatMutation,
    hooks.updateChatModeMutation,
    hooks.updateIsolatedModeMutation,
    hooks.sendSingleAgentMessage,
    hooks.activeChatId,
    hooks.isMobile,
    hooks.platforms,
    hooks.callAIAPI,
    hooks.startFreeMode,
    hooks.handleSend,
    hooks.input
  ]);

  // Handle scroll effects
  useScrollEffects(
    hooks.activeTab,
    hooks.messages,
    hooks.isLoadingMessages,
    hooks.activeChatId,
    hooks.lastScrollPosition,
    hooks.isUserScrolledUp,
    hooks.setupScrollListener,
    hooks.saveScrollPosition,
    hooks.restoreScrollPosition,
    hooks.scrollToBottom,
    hooks.scrollToBottomImmediate,
    hooks.previousMessageCountRef,
    hooks.previousActiveTabRef,
    hooks.user,
    hooks.reloadSettings
  );

  // Transform activeAIStatuses to match expected type
  const transformedStatuses = useMemo(() => {
    return Object.entries(hooks.activeAIStatuses).reduce((acc, [key, value]) => {
      acc[key] = value ? 'responding' : 'completed';
      return acc;
    }, {} as Record<string, 'thinking' | 'responding' | 'completed' | 'error'>);
  }, [hooks.activeAIStatuses]);

  // Get current chat with messages
  const currentChatWithMessages = useMemo(() => {
    const foundChat = hooks.chats?.find(chat => chat.id === hooks.activeChatId);
    if (!foundChat) return null;
    
    return {
      ...foundChat,
      messages: hooks.messages || []
    };
  }, [hooks.chats, hooks.activeChatId, hooks.messages]);

  // Hydrate demo conversation after auth
  useEffect(() => {
    const hydrateDemoConversation = async () => {
      if (!hooks.user) return;
      const stored = localStorage.getItem('demo_conversation');
      if (!stored) return;
      
      try {
        const demoMessages = JSON.parse(stored);
        localStorage.removeItem('demo_conversation');
        
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({ title: 'Demo Conversation', user_id: hooks.user.id })
          .select()
          .single();
        
        if (convError || !conv) return;

        const messagesToInsert = demoMessages
          .filter((m: any) => m.content && !m.typing)
          .map((m: any) => ({
            conversation_id: conv.id,
            content: m.content,
            sender: m.sender === 'user' ? 'user' : 'ai',
            platform: m.platform || null,
          }));

        if (messagesToInsert.length > 0) {
          await supabase.from('messages').insert(messagesToInsert);
        }

        hooks.setActiveChatId(conv.id);
      } catch (e) {
        console.error('Failed to hydrate demo conversation:', e);
        localStorage.removeItem('demo_conversation');
      }
    };

    hydrateDemoConversation();
  }, [hooks.user]);

  // Show loading while auth is being determined
  if (hooks.loading || hooks.isLoadingOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Hydrate demo conversation after auth
  useEffect(() => {
    const hydrateDemoConversation = async () => {
      if (!hooks.user) return;
      const stored = localStorage.getItem('demo_conversation');
      if (!stored) return;
      
      try {
        const demoMessages = JSON.parse(stored);
        localStorage.removeItem('demo_conversation');
        
        // Create a new conversation
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({ title: 'Demo Conversation', user_id: hooks.user.id })
          .select()
          .single();
        
        if (convError || !conv) return;

        // Insert demo messages
        const messagesToInsert = demoMessages
          .filter((m: any) => m.content && !m.typing)
          .map((m: any) => ({
            conversation_id: conv.id,
            content: m.content,
            sender: m.sender === 'user' ? 'user' : 'ai',
            platform: m.platform || null,
          }));

        if (messagesToInsert.length > 0) {
          await supabase.from('messages').insert(messagesToInsert);
        }

        // Switch to the new conversation
        hooks.setActiveChatId(conv.id);
      } catch (e) {
        console.error('Failed to hydrate demo conversation:', e);
        localStorage.removeItem('demo_conversation');
      }
    };

    hydrateDemoConversation();
  }, [hooks.user]);

  // Show enhanced landing page if not authenticated
  if (!hooks.user) {
    return <LandingPage />;
  }

  // Show welcome screen for new users
  if (hooks.hasCompletedOnboarding === false) {
    return (
      <WelcomeHandlers
        completeOnboarding={hooks.completeOnboarding}
        skipOnboarding={hooks.skipOnboarding}
        chats={hooks.chats}
        handleCreateChat={handlers.handleCreateChat}
      />
    );
  }

  // Prepare desktop interface props
  const desktopProps = {
    chats: hooks.chats,
    isLoadingChats: hooks.isLoadingChats,
    activeChatId: hooks.activeChatId,
    setActiveChatId: hooks.setActiveChatId,
    handleCreateChat: handlers.handleCreateChat,
    handleDeleteChat: handlers.handleDeleteChat,
    createChatMutation: hooks.createChatMutation,
    messages: hooks.messages,
    isLoadingMessages: hooks.isLoadingMessages,
    isLoadingResponse: hooks.isLoadingResponse,
    platforms: hooks.platforms,
    activeTab: hooks.activeTab,
    setActiveTab: hooks.setActiveTab,
    user: hooks.user,
    isFreeMode: hooks.isFreeMode,
    isFreeModeRunning: hooks.isFreeModeRunning,
    freeModeMessageLimit: hooks.freeModeMessageLimit,
    freeModeMessageCount: hooks.freeModeMessageCount,
    handleStartFreeMode: handlers.handleStartFreeMode,
    stopFreeMode: hooks.stopFreeMode,
    updateMessageLimit: hooks.updateMessageLimit,
    handleSingleAgentMessage: handlers.handleSingleAgentMessage,
    updateAgentOrder: hooks.updateAgentOrder,
    handleSignOut: hooks.handleSignOut,
    activeChatMode: hooks.activeChatMode,
    isolatedMode: hooks.isolatedMode,
    handleChatModeChange: handlers.handleChatModeChange,
    handleIsolatedModeToggle: handlers.handleIsolatedModeToggle,
    togglePlatform: hooks.togglePlatform,
    transformedStatuses,
    currentChatWithMessages,
    scrollAreaRef: hooks.scrollAreaRef,
    messagesEndRef: hooks.messagesEndRef,
    input: hooks.input,
    setInput: hooks.setInput,
    handleSend: hooks.handleSend,
    handleStop: hooks.handleStop,
    sendMessageMutation: hooks.sendMessageMutation,
    canStop: hooks.canStop,
    getPendingCount: hooks.getPendingCount,
    handleSendAndStartConversation: handlers.handleSendAndStartConversation,
    callAIAPI: hooks.callAIAPI
  };

  return <IndexLayout desktopProps={desktopProps} />;
};

export default Index;
