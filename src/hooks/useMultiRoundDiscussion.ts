
import { useCallback, useRef, useState } from 'react';
import type { Message, AIPlatform, Chat } from '@/types/chat';
import { toast } from 'sonner';
import { useChatState } from './useChatState';

export const useMultiRoundDiscussion = (
  platforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>,
  addMessage: (chatId: string, message: Message) => void,
  getCurrentChat: () => Chat | null
) => {
  const { state, updateState, setPlatformStatus, addError, clearError, resetState } = useChatState();
  const discussionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [discussionSummary, setDiscussionSummary] = useState<string[]>([]);

  const processAIResponse = useCallback(async (
    chatId: string,
    platform: AIPlatform,
    enabledPlatforms: AIPlatform[],
    roundNumber: number
  ) => {
    console.log(`[Round ${roundNumber}] ${platform.name} starting response...`);
    setPlatformStatus(platform.id, 'thinking');
    clearError(platform.id);

    try {
      const currentChat = getCurrentChat();
      if (!currentChat) {
        throw new Error('No current chat found');
      }

      setPlatformStatus(platform.id, 'responding');
      
      // Include all messages from the current discussion for context
      const response = await callAIAPI(platform, currentChat.messages, enabledPlatforms);
      
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: [],
        roundNumber
      };
      
      addMessage(chatId, agentMessage);
      setPlatformStatus(platform.id, 'completed');
      console.log(`[Round ${roundNumber}] ${platform.name} response completed`);

      return agentMessage;
    } catch (error) {
      console.error(`[Round ${roundNumber}] ${platform.name} Error:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addError(platform.id, errorMsg);
      setPlatformStatus(platform.id, 'error');
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: `❌ ${platform.name} encountered an error: ${errorMsg}`,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: [],
        roundNumber
      };
      addMessage(chatId, errorMessage);

      throw error;
    }
  }, [setPlatformStatus, addError, clearError, callAIAPI, addMessage, getCurrentChat]);

  const executeRound = useCallback(async (
    chatId: string,
    enabledPlatforms: AIPlatform[],
    roundNumber: number
  ) => {
    console.log(`=== Starting Round ${roundNumber} ===`);
    
    updateState({
      activeResponders: new Set(enabledPlatforms.map(p => p.id)),
      roundCount: roundNumber
    });

    // Reset platform statuses for new round
    enabledPlatforms.forEach(platform => {
      setPlatformStatus(platform.id, 'idle');
      clearError(platform.id);
    });

    const roundPromises = enabledPlatforms.map((platform, index) => 
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            await processAIResponse(chatId, platform, enabledPlatforms, roundNumber);
          } catch (error) {
            console.error(`Platform ${platform.name} failed in round ${roundNumber}:`, error);
          } finally {
            // Remove from active responders when done (success or error)
            updateState(prevState => ({
              activeResponders: new Set([...prevState.activeResponders].filter(id => id !== platform.id))
            }));
            resolve();
          }
        }, index * 1000); // 1 second delay between each agent in a round
      })
    );

    await Promise.all(roundPromises);
    
    console.log(`=== Round ${roundNumber} completed ===`);
    
    // Wait a bit before starting next round to allow users to read responses
    return new Promise<void>((resolve) => {
      roundTimeoutRef.current = setTimeout(() => {
        resolve();
      }, 3000); // 3 second pause between rounds
    });
  }, [updateState, setPlatformStatus, clearError, processAIResponse]);

  const shouldContinueDiscussion = useCallback((roundNumber: number, maxRounds: number) => {
    if (roundNumber >= maxRounds) {
      return false;
    }

    const currentChat = getCurrentChat();
    if (!currentChat) return false;

    // Get recent messages from the last round
    const recentMessages = currentChat.messages
      .filter(m => m.sender === 'ai')
      .slice(-platforms.filter(p => p.enabled && p.hasApiKey).length);

    // Simple heuristic: continue if messages are engaging (contain questions or specific topics)
    const hasEngagingContent = recentMessages.some(msg => 
      msg.content.includes('?') || 
      msg.content.toLowerCase().includes('however') ||
      msg.content.toLowerCase().includes('but') ||
      msg.content.toLowerCase().includes('disagree') ||
      msg.content.length > 200 // Detailed responses suggest engagement
    );

    return hasEngagingContent;
  }, [platforms, getCurrentChat]);

  const startDiscussion = useCallback(async (
    chatId: string,
    userMessage: Message,
    enabledPlatforms: AIPlatform[]
  ) => {
    console.log('=== STARTING MULTI-ROUND DISCUSSION ===');
    
    if (enabledPlatforms.length === 0) {
      toast.error('Please enable at least one AI platform with a valid API key');
      return;
    }

    if (enabledPlatforms.length < 2) {
      toast.info('Multi-round discussions work best with 2+ AI platforms');
    }

    const currentChat = getCurrentChat();
    if (!currentChat) {
      toast.error('No active chat found');
      return;
    }

    // Initialize discussion state
    updateState({
      isDiscussionActive: true,
      activeResponders: new Set(),
      roundCount: 0,
      messageCount: currentChat.messages.length
    });

    setDiscussionSummary([]);

    try {
      for (let round = 1; round <= state.maxRounds; round++) {
        console.log(`Starting round ${round} of ${state.maxRounds}`);
        
        await executeRound(chatId, enabledPlatforms, round);
        
        // Check if we should continue to next round
        if (round < state.maxRounds && !shouldContinueDiscussion(round, state.maxRounds)) {
          console.log(`Discussion naturally concluded after round ${round}`);
          toast.info(`Discussion concluded naturally after ${round} round(s)`);
          break;
        }
      }
    } catch (error) {
      console.error('Error in multi-round discussion:', error);
      toast.error('Discussion encountered an error');
    } finally {
      finishDiscussion();
    }

    // Set overall timeout
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
    }
    
    discussionTimeoutRef.current = setTimeout(() => {
      console.log('Discussion timeout reached');
      stopDiscussion();
      toast.info('Discussion timeout reached');
    }, 120000); // 2 minute timeout for multi-round discussions

  }, [state.maxRounds, updateState, getCurrentChat, executeRound, shouldContinueDiscussion]);

  const finishDiscussion = useCallback(() => {
    console.log('=== DISCUSSION FINISHED ===');
    
    const currentChat = getCurrentChat();
    if (currentChat) {
      const aiMessages = currentChat.messages.filter(m => m.sender === 'ai').slice(-10);
      const summary = [`Discussion completed with ${state.roundCount} round(s)`, 
                      `${aiMessages.length} total AI responses`,
                      'Agents engaged in collaborative discussion'];
      setDiscussionSummary(summary);
    }

    resetState();
    toast.success(`Discussion completed after ${state.roundCount} round(s)!`);
  }, [resetState, getCurrentChat, state.roundCount]);

  const stopDiscussion = useCallback(() => {
    console.log('=== STOPPING DISCUSSION ===');
    
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
      discussionTimeoutRef.current = null;
    }

    if (roundTimeoutRef.current) {
      clearTimeout(roundTimeoutRef.current);
      roundTimeoutRef.current = null;
    }

    finishDiscussion();
  }, [finishDiscussion]);

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
    discussionSummary,
    setMaxRounds: (rounds: number) => updateState({ maxRounds: rounds })
  };
};
