
import type { AIPlatform, ChatMode, Message } from '@/types/chat';

/** Minimal shape of a react-query mutation used by the index handlers. */
interface MutationLike<TVariables> {
  mutate: (variables: TVariables) => unknown;
}

type CallAIAPI = (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>;
type SendSingleAgentMessage = (chatId: string, message: string, platformId: string) => Promise<void>;

export const createIndexHandlers = (
  deleteChatMutation: MutationLike<string>,
  createChatMutation: MutationLike<{ title: string; chatMode: ChatMode }>,
  updateChatModeMutation: MutationLike<{ chatId: string; chatMode: ChatMode }>,
  updateIsolatedModeMutation: MutationLike<{ chatId: string; isolatedMode: boolean }>,
  sendSingleAgentMessage: SendSingleAgentMessage,
  activeChatId: string | null,
  isMobile: boolean,
  platforms: AIPlatform[],
  callAIAPI: CallAIAPI,
  startFreeMode: (
    activeChatId: string | null,
    platforms: AIPlatform[],
    callAIAPI: CallAIAPI,
    sendSingleAgentMessage: SendSingleAgentMessage,
  ) => unknown,
  handleSend: (activeChatId: string | null) => unknown,
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
