import { useState, useCallback, useRef } from 'react';
import type { Message, AIPlatform, Chat } from '@/types/chat';
import { toast } from 'sonner';

interface DiscussionState {
  isActive: boolean;
  activeResponders: Set<string>;
  roundCount: number;
  maxRounds: number;
  responseTimeout: number;
}

export const useDiscussion = (
  platforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>,
  addMessage: (chatId: string, message: Message) => void,
  getCurrentChat: () => Chat | null
) => {
  const [discussionState, setDiscussionState] = useState<DiscussionState>({
    isActive: false,
    activeResponders: new Set(),
    roundCount: 0,
    maxRounds: 5,
    responseTimeout: 30000, // 30 seconds
  });

  const activeTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const discussionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedMessageCount = useRef<number>(0);

  const startDiscussion = useCallback(async (
    chatId: string,
    userMessage: Message,
    enabledPlatforms: AIPlatform[]
  ) => {
    console.log('=== STARTING DISCUSSION ===');
    console.log('Chat ID:', chatId);
    console.log('User message content:', userMessage.content);
    console.log('Enabled platforms count:', enabledPlatforms.length);

    if (enabledPlatforms.length === 0) {
      console.error('ERROR: No enabled platforms available');
      toast.error('Please enable at least one AI platform with a valid API key');
      return;
    }

    const currentChat = getCurrentChat();
    if (!currentChat) {
      console.error('ERROR: No current chat found');
      toast.error('No active chat found');
      return;
    }

    // Store initial message count
    lastProcessedMessageCount.current = currentChat.messages.length;
    console.log('Initial message count:', lastProcessedMessageCount.current);

    console.log('Setting discussion state to active...');
    setDiscussionState(prev => ({
      ...prev,
      isActive: true,
      activeResponders: new Set(enabledPlatforms.map(p => p.id)),
      roundCount: 1
    }));

    // Start AI responses with staggered timing
    console.log('Starting AI responses for platforms:', enabledPlatforms.map(p => p.name));
    
    for (let i = 0; i < enabledPlatforms.length; i++) {
      const platform = enabledPlatforms[i];
      const delay = i * 1000; // 1 second delay between each request
      
      console.log(`[${i + 1}/${enabledPlatforms.length}] Scheduling ${platform.name} response in ${delay}ms`);
      
      setTimeout(async () => {
        console.log(`[${platform.name}] ⏰ Starting processAIResponse NOW`);
        try {
          await processAIResponse(chatId, platform, enabledPlatforms);
          console.log(`[${platform.name}] ✅ processAIResponse completed successfully`);
        } catch (error) {
          console.error(`[${platform.name}] ❌ processAIResponse failed:`, error);
          
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            content: `❌ ${platform.name} encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sender: 'ai',
            platform: platform.id,
            created_at: new Date().toISOString(),
            conversation_id: chatId,
            timestamp: new Date(),
            status: 'sent',
            seenBy: []
          };
          addMessage(chatId, errorMessage);
          
          setDiscussionState(prev => {
            const newActiveResponders = new Set(prev.activeResponders);
            newActiveResponders.delete(platform.id);
            console.log(`[${platform.name}] Removed from active responders due to error. Remaining:`, Array.from(newActiveResponders));
            return {
              ...prev,
              activeResponders: newActiveResponders
            };
          });
        }
      }, delay);
    }

    // Set overall discussion timeout
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
    }
    
    discussionTimeoutRef.current = setTimeout(() => {
      console.log('=== DISCUSSION TIMEOUT REACHED ===');
      stopDiscussion();
      toast.info('Discussion timeout reached');
    }, discussionState.responseTimeout * discussionState.maxRounds);

  }, [discussionState.responseTimeout, discussionState.maxRounds, addMessage, getCurrentChat]);

  const processAIResponse = useCallback(async (
    chatId: string,
    platform: AIPlatform,
    enabledPlatforms: AIPlatform[]
  ) => {
    console.log(`=== [${platform.name}] PROCESSING AI RESPONSE START ===`);
    
    try {
      const currentChat = getCurrentChat();
      if (!currentChat) {
        console.error(`[${platform.name}] ERROR: No current chat found during processing`);
        throw new Error('No current chat found');
      }

      console.log(`[${platform.name}] Current chat has ${currentChat.messages.length} messages`);
      console.log(`[${platform.name}] 🔄 Making callAIAPI call...`);
      
      const response = await callAIAPI(platform, currentChat.messages, enabledPlatforms);
      console.log(`[${platform.name}] ✅ API call completed`);
      console.log(`[${platform.name}] Response length: ${response.length} characters`);
      
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
      
      console.log(`[${platform.name}] 📨 Adding message to chat with ID: ${agentMessage.id}`);
      addMessage(chatId, agentMessage);
      console.log(`[${platform.name}] ✅ addMessage call completed`);

      // Remove from active responders
      setDiscussionState(prev => {
        const newActiveResponders = new Set(prev.activeResponders);
        newActiveResponders.delete(platform.id);
        
        console.log(`[${platform.name}] Removed from active responders`);
        console.log(`Remaining active responders: [${Array.from(newActiveResponders).join(', ')}]`);
        
        // Check if this was the last responder for this round
        if (newActiveResponders.size === 0) {
          console.log('🎯 All responders finished - triggering next round check in 3 seconds');
          setTimeout(() => {
            checkForNextRound(chatId, enabledPlatforms);
          }, 3000);
        }
        
        return {
          ...prev,
          activeResponders: newActiveResponders
        };
      });
      
    } catch (error) {
      console.error(`=== [${platform.name}] PROCESSING ERROR ===`, error);
      throw error;
    }
  }, [callAIAPI, addMessage, getCurrentChat]);

  const checkForNextRound = useCallback((chatId: string, enabledPlatforms: AIPlatform[]) => {
    console.log('=== CHECKING FOR NEXT ROUND ===');
    
    setDiscussionState(prev => {
      console.log('Next round check - Current state:', {
        isActive: prev.isActive,
        roundCount: prev.roundCount,
        maxRounds: prev.maxRounds,
        activeResponders: Array.from(prev.activeResponders),
        activeCount: prev.activeResponders.size
      });

      // If discussion is not active, stop
      if (!prev.isActive) {
        console.log('Discussion not active - stopping');
        return prev;
      }

      // If we've reached max rounds, stop
      if (prev.roundCount >= prev.maxRounds) {
        console.log('Discussion finished: max rounds reached');
        toast.info(`Discussion completed after ${prev.maxRounds} rounds`);
        return {
          ...prev,
          isActive: false,
          activeResponders: new Set(),
          roundCount: 0
        };
      }

      // If there are still active responders, wait
      if (prev.activeResponders.size > 0) {
        console.log(`Still waiting for ${prev.activeResponders.size} active responders`);
        return prev;
      }

      // Get current chat and check message count
      const currentChat = getCurrentChat();
      if (!currentChat) {
        console.log('No current chat for next round check');
        return {
          ...prev,
          isActive: false,
          activeResponders: new Set(),
          roundCount: 0
        };
      }

      const currentMessageCount = currentChat.messages.length;
      console.log('Message count check:', {
        current: currentMessageCount,
        lastProcessed: lastProcessedMessageCount.current,
        hasNewMessages: currentMessageCount > lastProcessedMessageCount.current
      });

      // Check if we have new messages since last round
      if (currentMessageCount > lastProcessedMessageCount.current) {
        const continueChance = Math.random();
        const shouldContinue = continueChance > 0.3; // 70% chance to continue
        
        console.log('Continue decision:', {
          chance: continueChance,
          shouldContinue,
          threshold: 0.3
        });

        if (shouldContinue) {
          console.log(`=== STARTING ROUND ${prev.roundCount + 1} ===`);
          
          // Select platforms for next round (60% chance each)
          const nextRoundPlatforms = enabledPlatforms.filter(() => Math.random() > 0.4);
          
          if (nextRoundPlatforms.length > 0) {
            console.log(`Round ${prev.roundCount + 1} participants: [${nextRoundPlatforms.map(p => p.name).join(', ')}]`);
            
            // Update last processed message count
            lastProcessedMessageCount.current = currentMessageCount;
            
            // Start next round responses with staggered timing
            nextRoundPlatforms.forEach((platform, index) => {
              const delay = Math.random() * 2000 + 1000; // 1-3 seconds random delay
              console.log(`Scheduling ${platform.name} for round ${prev.roundCount + 1} in ${Math.round(delay)}ms`);
              
              setTimeout(() => {
                console.log(`Triggering round ${prev.roundCount + 1} response from ${platform.name}`);
                processAIResponse(chatId, platform, enabledPlatforms).catch(error => {
                  console.error(`Round ${prev.roundCount + 1} error for ${platform.name}:`, error);
                });
              }, delay);
            });

            return {
              ...prev,
              roundCount: prev.roundCount + 1,
              activeResponders: new Set(nextRoundPlatforms.map(p => p.id))
            };
          } else {
            console.log('No platforms selected for next round - ending discussion');
          }
        } else {
          console.log('Random chance decided to end discussion');
        }
      } else {
        console.log('No new messages since last round - ending discussion');
      }

      // End discussion
      toast.info('Discussion concluded naturally');
      return {
        ...prev,
        isActive: false,
        activeResponders: new Set(),
        roundCount: 0
      };
    });
  }, [getCurrentChat, processAIResponse]);

  const stopDiscussion = useCallback(() => {
    console.log('=== STOPPING DISCUSSION ===');
    
    setDiscussionState(prev => ({
      ...prev,
      isActive: false,
      activeResponders: new Set(),
      roundCount: 0
    }));

    // Clear all timeouts
    activeTimeouts.current.forEach(timeout => clearTimeout(timeout));
    activeTimeouts.current.clear();
    
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
      discussionTimeoutRef.current = null;
    }

    // Reset message count tracker
    lastProcessedMessageCount.current = 0;

    console.log('Discussion stopped successfully');
    toast.info('Discussion stopped');
  }, []);

  const isDiscussionActive = discussionState.isActive;
  const activeResponders = Array.from(discussionState.activeResponders);

  return {
    startDiscussion,
    stopDiscussion,
    isDiscussionActive,
    activeResponders,
    roundCount: discussionState.roundCount,
    maxRounds: discussionState.maxRounds,
    setMaxRounds: (rounds: number) => setDiscussionState(prev => ({ ...prev, maxRounds: rounds }))
  };
};
