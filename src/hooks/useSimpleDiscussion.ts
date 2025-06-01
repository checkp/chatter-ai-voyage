
import { useCallback, useRef } from 'react';
import type { Message, AIPlatform, Chat } from '@/types/chat';
import { toast } from 'sonner';
import { useChatState } from './useChatState';

export const useSimpleDiscussion = (
  platforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>,
  addMessage: (chatId: string, message: Message) => void,
  getCurrentChat: () => Chat | null
) => {
  const { state, updateState, setPlatformStatus, addError, clearError, resetState } = useChatState();
  const discussionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processAIResponse = useCallback(async (
    chatId: string,
    platform: AIPlatform,
    enabledPlatforms: AIPlatform[]
  ) => {
    console.log(`[${platform.name}] Starting response...`);
    setPlatformStatus(platform.id, 'thinking');
    clearError(platform.id);

    try {
      const currentChat = getCurrentChat();
      if (!currentChat) {
        throw new Error('No current chat found');
      }

      setPlatformStatus(platform.id, 'responding');
      const response = await callAIAPI(platform, currentChat.messages || [], enabledPlatforms);
      
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        sender: 'ai',
        platform: platform.id,
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      
      addMessage(chatId, agentMessage);
      setPlatformStatus(platform.id, 'completed');
      console.log(`[${platform.name}] Response completed successfully`);

      // Remove from active responders
      updateState({
        activeResponders: new Set([...state.activeResponders].filter(id => id !== platform.id))
      });

    } catch (error) {
      console.error(`[${platform.name}] Error:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addError(platform.id, errorMsg);
      setPlatformStatus(platform.id, 'error');
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: `❌ ${platform.name} encountered an error: ${errorMsg}`,
        sender: 'ai',
        platform: platform.id,
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      addMessage(chatId, errorMessage);

      // Remove from active responders on error
      updateState({
        activeResponders: new Set([...state.activeResponders].filter(id => id !== platform.id))
      });
    }
  }, [state.activeResponders, setPlatformStatus, addError, clearError, updateState, callAIAPI, addMessage, getCurrentChat]);

  const startDiscussion = useCallback(async (
    chatId: string,
    userMessage: Message,
    enabledPlatforms: AIPlatform[]
  ) => {
    console.log('=== STARTING DISCUSSION ===');
    
    if (enabledPlatforms.length === 0) {
      toast.error('Please enable at least one AI platform with a valid API key');
      return;
    }

    const currentChat = getCurrentChat();
    if (!currentChat) {
      toast.error('No active chat found');
      return;
    }

    // Reset all platform statuses
    enabledPlatforms.forEach(platform => {
      setPlatformStatus(platform.id, 'idle');
      clearError(platform.id);
    });

    updateState({
      isDiscussionActive: true,
      activeResponders: new Set(enabledPlatforms.map(p => p.id)),
      roundCount: 1,
      messageCount: currentChat.messages.length
    });

    // Start AI responses with small delays
    enabledPlatforms.forEach((platform, index) => {
      setTimeout(() => {
        processAIResponse(chatId, platform, enabledPlatforms);
      }, index * 500); // 500ms delay between each
    });

    // Set overall timeout
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
    }
    
    discussionTimeoutRef.current = setTimeout(() => {
      console.log('Discussion timeout reached');
      stopDiscussion();
      toast.info('Discussion timeout reached');
    }, 60000); // 1 minute timeout

  }, [updateState, setPlatformStatus, clearError, processAIResponse, getCurrentChat]);

  const stopDiscussion = useCallback(() => {
    console.log('=== STOPPING DISCUSSION ===');
    
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
      discussionTimeoutRef.current = null;
    }

    resetState();
    toast.info('Discussion stopped');
  }, [resetState]);

  const forceStop = useCallback(() => {
    console.log('=== FORCE STOPPING DISCUSSION ===');
    stopDiscussion();
  }, [stopDiscussion]);

  return {
    state,
    startDiscussion,
    stopDiscussion,
    forceStop,
    isDiscussionActive: state.isDiscussionActive,
    activeResponders: Array.from(state.activeResponders),
    roundCount: state.roundCount,
    maxRounds: state.maxRounds,
    platformStatuses: state.platformStatuses,
    errors: state.errors,
    setMaxRounds: (rounds: number) => updateState({ maxRounds: rounds })
  };
};
