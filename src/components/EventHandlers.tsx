
import { toast } from 'sonner';
import type { ChatMode } from '@/types/chat';

export const useEventHandlers = (
  activeChatId: string | null,
  updateChatModeMutation: any,
  updateConductorPlatformMutation: any,
  updateIsolatedModeMutation: any,
  sendMessageMutation: any,
  setActiveTab: (tab: string) => void,
  resetConductorChat: () => void
) => {
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

  return {
    handleChatModeChange,
    handleConductorPlatformChange,
    handleIsolatedModeToggle,
    handleSendMessage
  };
};
