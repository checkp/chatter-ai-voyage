
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useConductorChat } from '@/hooks/useConductorChat';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useFreeMode } from '@/hooks/useFreeMode';
import { useUIState } from '@/hooks/useUIState';
import { useEventHandlers } from '@/components/EventHandlers';

export const useIndexPageLogic = () => {
  const { user, handleSignOut } = useAuth();
  const { platforms, togglePlatform, updateAgentOrder, callAIAPI } = usePlatforms(user);
  
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
    startFreeMode: startFreeModeOriginal,
    stopFreeMode,
    updateMessageLimit
  } = useFreeMode();

  const {
    activeTab,
    setActiveTab
  } = useUIState();

  const [showWelcome, setShowWelcome] = useState(false);
  const [input, setInput] = useState('');

  // Send single agent message function for free mode
  const sendSingleAgentMessage = async (chatId: string, message: string, platformId: string) => {
    if (!user || !activeChatId) return;
    
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) {
        console.error(`Platform not found: ${platformId}`);
        return;
      }
      
      const response = await callAIAPI(platform, messages || [], platforms, activeChatMode);
      
      // Add the AI response to the chat
      // This would typically go through the message handling system
      console.log(`${platform.name} response:`, response);
    } catch (error) {
      console.error(`Error with ${platformId}:`, error);
    }
  };

  // Wrapper for startFreeMode with proper parameters
  const startFreeMode = () => {
    if (activeChatId) {
      startFreeModeOriginal(
        activeChatId, 
        platforms, 
        callAIAPI, 
        sendSingleAgentMessage
      );
    }
  };

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

  // Auto-create first chat if none exists - Add error handling to prevent infinite loops
  useEffect(() => {
    if (isInitialLoadComplete && user && (!chats || chats.length === 0)) {
      // Only create chat if not already creating one
      if (!createChatMutation.isPending) {
        console.log('Auto-creating first chat for user');
        createChatMutation.mutate({ title: 'New Conversation' });
      }
    }
  }, [isInitialLoadComplete, user, chats, createChatMutation]);

  // Show welcome screen for new users
  useEffect(() => {
    if (user && isInitialLoadComplete && (!chats || chats.length === 0)) {
      setShowWelcome(true);
    }
  }, [user, isInitialLoadComplete, chats]);

  return {
    user,
    handleSignOut,
    platforms,
    togglePlatform,
    updateAgentOrder,
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    activeChatMode,
    isolatedMode,
    conductorPlatform,
    setActiveChatId,
    createChatMutation,
    deleteChatMutation,
    activeAIStatuses,
    sendMessageMutation,
    conductorPlatformObj,
    conductorMessages,
    isLoadingConductor,
    sendConductorMessage,
    isFreeMode,
    isFreeModeRunning,
    freeModeMessageCount,
    freeModeMessageLimit,
    startFreeMode,
    stopFreeMode,
    updateMessageLimit,
    activeTab,
    setActiveTab,
    showWelcome,
    setShowWelcome,
    input,
    setInput,
    handleChatModeChange,
    handleConductorPlatformChange,
    handleIsolatedModeToggle,
    handleSendMessage,
    handleSend,
    isInitialLoadComplete
  };
};
