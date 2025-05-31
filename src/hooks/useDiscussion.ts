
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

  const startDiscussion = useCallback(async (
    chatId: string,
    userMessage: Message,
    enabledPlatforms: AIPlatform[]
  ) => {
    console.log('=== STARTING DISCUSSION ===');
    console.log('Chat ID:', chatId);
    console.log('User message:', userMessage.content.substring(0, 50) + '...');
    console.log('Enabled platforms:', enabledPlatforms.map(p => p.name));

    if (enabledPlatforms.length === 0) {
      console.log('ERROR: No enabled platforms');
      toast.error('Please enable at least one AI platform with a valid API key');
      return;
    }

    console.log('Setting discussion state to active...');
    setDiscussionState(prev => {
      console.log('Previous state:', prev);
      const newState = {
        ...prev,
        isActive: true,
        activeResponders: new Set(enabledPlatforms.map(p => p.id)),
        roundCount: 1
      };
      console.log('New state:', newState);
      return newState;
    });

    // Start parallel AI responses immediately
    console.log('Starting parallel AI responses...');
    enabledPlatforms.forEach((platform, index) => {
      console.log(`[${index + 1}/${enabledPlatforms.length}] Starting response from ${platform.name}...`);
      
      // Add a small delay to stagger the requests
      setTimeout(() => {
        console.log(`Triggering processAIResponse for ${platform.name}`);
        processAIResponse(chatId, platform, enabledPlatforms).catch(error => {
          console.error(`Failed to process response for ${platform.name}:`, error);
        });
      }, index * 500); // 500ms delay between each request
    });

    // Set overall discussion timeout
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
    }
    
    discussionTimeoutRef.current = setTimeout(() => {
      console.log('=== DISCUSSION TIMEOUT REACHED ===');
      stopDiscussion();
      toast.info('Discussion timeout reached');
    }, discussionState.responseTimeout * discussionState.maxRounds);

  }, [discussionState.responseTimeout, discussionState.maxRounds]);

  const processAIResponse = useCallback(async (
    chatId: string,
    platform: AIPlatform,
    enabledPlatforms: AIPlatform[]
  ) => {
    console.log(`=== PROCESSING AI RESPONSE: ${platform.name} ===`);
    
    try {
      const currentChat = getCurrentChat();
      if (!currentChat) {
        console.log(`ERROR: No current chat found for ${platform.name}`);
        return;
      }

      console.log(`${platform.name}: Chat has ${currentChat.messages.length} messages`);
      console.log(`${platform.name}: Making API call...`);
      
      // Show that this platform is thinking
      console.log(`${platform.name}: Adding "thinking" indicator...`);
      
      const startTime = Date.now();
      const response = await callAIAPI(platform, currentChat.messages, enabledPlatforms);
      const endTime = Date.now();
      
      console.log(`${platform.name}: Got response in ${endTime - startTime}ms`);
      console.log(`${platform.name}: Response length: ${response.length} characters`);
      console.log(`${platform.name}: Response preview: "${response.substring(0, 100)}..."`);
      
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      
      console.log(`${platform.name}: Adding message to chat with ID: ${agentMessage.id}`);
      addMessage(chatId, agentMessage);
      console.log(`${platform.name}: Message added successfully`);

      // Remove from active responders
      setDiscussionState(prev => {
        const newActiveResponders = new Set(prev.activeResponders);
        const wasActive = newActiveResponders.has(platform.id);
        newActiveResponders.delete(platform.id);
        
        console.log(`${platform.name}: Was active: ${wasActive}, Remaining responders: [${Array.from(newActiveResponders).join(', ')}]`);
        
        return {
          ...prev,
          activeResponders: newActiveResponders
        };
      });

      // Check if we should trigger another round
      setTimeout(() => {
        console.log(`${platform.name}: Checking for next round after 2s delay...`);
        checkForNextRound(chatId, enabledPlatforms);
      }, 2000);
      
    } catch (error) {
      console.error(`=== ERROR in ${platform.name} ===`, error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: `❌ Error from ${platform.name}: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      
      console.log(`${platform.name}: Adding error message to chat`);
      addMessage(chatId, errorMessage);

      // Remove from active responders even on error
      setDiscussionState(prev => {
        const newActiveResponders = new Set(prev.activeResponders);
        newActiveResponders.delete(platform.id);
        console.log(`${platform.name}: Removed due to error. Remaining: [${Array.from(newActiveResponders).join(', ')}]`);
        return {
          ...prev,
          activeResponders: newActiveResponders
        };
      });

      toast.error(`${platform.name} encountered an error`);
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

      // If discussion is not active or we've reached max rounds, stop
      if (!prev.isActive || prev.roundCount >= prev.maxRounds) {
        console.log('Discussion finished: max rounds reached or not active');
        if (prev.roundCount >= prev.maxRounds) {
          toast.info(`Discussion completed after ${prev.maxRounds} rounds`);
        }
        return prev;
      }

      // If there are still active responders, wait
      if (prev.activeResponders.size > 0) {
        console.log(`Still waiting for ${prev.activeResponders.size} active responders: [${Array.from(prev.activeResponders).join(', ')}]`);
        return prev;
      }

      // Check if there are recent messages that might trigger responses
      const currentChat = getCurrentChat();
      if (!currentChat) {
        console.log('No current chat for next round check');
        return prev;
      }

      const recentMessages = currentChat.messages.slice(-5); // Look at last 5 messages
      const hasRecentAIMessages = recentMessages.some(msg => 
        msg.sender === 'ai' && 
        Date.now() - msg.timestamp.getTime() < 15000 // 15 seconds
      );

      console.log('Recent messages check:', {
        totalMessages: currentChat.messages.length,
        recentMessagesCount: recentMessages.length,
        hasRecentAIMessages,
        continueChance: hasRecentAIMessages ? '70%' : '0%'
      });

      if (hasRecentAIMessages && Math.random() > 0.3) { // 70% chance to continue
        console.log(`=== STARTING ROUND ${prev.roundCount + 1} ===`);
        
        // Start next round with a subset of platforms (randomly select some)
        const activeAgents = enabledPlatforms.filter(() => Math.random() > 0.4); // 60% chance each
        
        if (activeAgents.length > 0) {
          console.log(`Round ${prev.roundCount + 1} participants: [${activeAgents.map(p => p.name).join(', ')}]`);
          
          // Stagger the responses
          activeAgents.forEach((platform, index) => {
            const delay = Math.random() * 3000 + 1000; // 1-4 seconds random delay
            console.log(`Scheduling ${platform.name} response in ${Math.round(delay)}ms`);
            
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
            activeResponders: new Set(activeAgents.map(p => p.id))
          };
        } else {
          console.log('No agents selected for next round - discussion ending naturally');
        }
      } else {
        console.log('Discussion naturally concluded - no recent AI messages or random chance');
        toast.info('Discussion concluded naturally');
      }

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
    
    setDiscussionState(prev => {
      console.log('Stopping discussion - Previous state:', prev);
      return {
        ...prev,
        isActive: false,
        activeResponders: new Set(),
        roundCount: 0
      };
    });

    // Clear all timeouts
    activeTimeouts.current.forEach(timeout => clearTimeout(timeout));
    activeTimeouts.current.clear();
    
    if (discussionTimeoutRef.current) {
      clearTimeout(discussionTimeoutRef.current);
      discussionTimeoutRef.current = null;
    }

    console.log('Discussion stopped successfully');
    toast.info('Discussion stopped');
  }, []);

  const isDiscussionActive = discussionState.isActive;
  const activeResponders = Array.from(discussionState.activeResponders);

  console.log('Discussion hook state:', {
    isActive: isDiscussionActive,
    activeResponders,
    roundCount: discussionState.roundCount
  });

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
