
import type { ChatMode } from '@/types/chat';

export const createIndexHandlers = (
  deleteChatMutation: any,
  createChatMutation: any,
  updateChatModeMutation: any,
  updateIsolatedModeMutation: any,
  sendSingleAgentMessage: any,
  activeChatId: string | null,
  isMobile: boolean,
  platforms: any[],
  callAIAPI: any,
  startFreeMode: any,
  handleSend: any,
  input: string
) => {
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

  return {
    handleDeleteChat,
    handleCreateChat,
    handleChatModeChange,
    handleIsolatedModeToggle,
    handleSingleAgentMessage,
    handleStartFreeMode,
    handleSendAndStartConversation
  };
};
