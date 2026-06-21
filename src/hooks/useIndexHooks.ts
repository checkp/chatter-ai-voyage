
import { useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useUIState } from '@/hooks/useUIState';
import { useFreeMode } from '@/hooks/useFreeMode';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCapabilityDefaults } from '@/hooks/useCapabilityDefaults';

export const useIndexHooks = () => {
  const { user, loading, handleSignOut } = useAuth();
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  // Warm the per-agent capability defaults registry as soon as we have a user.
  useCapabilityDefaults(user);

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

  return {
    user,
    loading,
    handleSignOut,
    theme,
    isMobile,
    platforms,
    togglePlatform,
    callAIAPI,
    reloadSettings,
    updateAgentOrder,
    messagesEndRef,
    scrollAreaRef,
    scrollToBottom,
    scrollToBottomImmediate,
    saveScrollPosition,
    restoreScrollPosition,
    setupScrollListener,
    isUserScrolledUp,
    lastScrollPosition,
    hasCompletedOnboarding,
    isLoadingOnboarding,
    completeOnboarding,
    skipOnboarding,
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
    isInitialLoadComplete,
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
    sendSingleAgentMessage,
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab,
    isFreeMode,
    freeModeMessageLimit,
    freeModeMessageCount,
    isFreeModeRunning,
    startFreeMode,
    stopFreeMode,
    updateMessageLimit,
    previousMessageCountRef,
    previousActiveTabRef
  };
};
