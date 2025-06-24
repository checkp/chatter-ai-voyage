import { useAuth } from '@/hooks/useAuth';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useConductorChat } from '@/hooks/useConductorChat';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useFreeMode } from '@/hooks/useFreeMode';
import { useUIState } from '@/hooks/useUIState';
import { useEventHandlers } from '@/components/EventHandlers';
import { useMessageInput } from '@/hooks/useMessageInput';
import { useWelcomeScreen } from '@/hooks/useWelcomeScreen';
import { useAutoCreateChat } from '@/hooks/useAutoCreateChat';
import { useFreeModeIntegration } from '@/hooks/useFreeModeIntegration';

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

  // Free mode integration
  const { sendSingleAgentMessage } = useFreeModeIntegration(
    user,
    activeChatId,
    platforms,
    messages,
    activeChatMode,
    callAIAPI
  );

  // Message input handling
  const { input, setInput, handleSend } = useMessageInput(handleSendMessage);

  // Welcome screen management
  const { showWelcome, setShowWelcome } = useWelcomeScreen(user, isInitialLoadComplete, chats);

  // Auto-create first chat
  useAutoCreateChat(user, isInitialLoadComplete, chats, createChatMutation);

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
