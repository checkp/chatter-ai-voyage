
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
    if (enabledPlatforms.length === 0) {
      toast.error('Please enable at least one AI platform with a valid API key');
      return;
    }

    console.log('Starting discussion with platforms:', enabledPlatforms.map(p => p.name));

    setDiscussionState(prev => ({
      ...prev,
      isActive: true,
      activeResponders: new Set(enabledPlatforms.map(p => p.id)),
      roundCount: 1
    }));

    // Start parallel AI responses
    enabledPlatforms.forEach(platform => {
      console.log(`Triggering response from ${platform.name}...`);
      processAIResponse(chatId, platform, enabledPlatforms);
    });

    // Set overall discussion timeout
    discussionTimeoutRef.current = setTimeout(() => {
      console.log('Discussion timeout reached, stopping...');
      stopDiscussion();
    }, discussionState.responseTimeout * discussionState.maxRounds);
  }, [discussionState.responseTimeout, discussionState.maxRounds]);

  const processAIResponse = useCallback(async (
    chatId: string,
    platform: AIPlatform,
    enabledPlatforms: AIPlatform[]
  ) => {
    try {
      console.log(`${platform.name} is thinking...`);
      
      const currentChat = getCurrentChat();
      if (!currentChat) {
        console.log('No current chat found');
        return;
      }

      console.log(`Calling ${platform.name} API...`);
      const response = await callAIAPI(platform, currentChat.messages, enabledPlatforms);
      console.log(`${platform.name} responded:`, response.substring(0, 100) + '...');
      
      const agentMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      
      // Add message immediately to update UI
      console.log(`Adding ${platform.name} message to chat...`);
      addMessage(chatId, agentMessage);

      // Remove from active responders
      setDiscussionState(prev => {
        const newActiveResponders = new Set(prev.activeResponders);
        newActiveResponders.delete(platform.id);
        console.log(`${platform.name} finished. Remaining responders:`, Array.from(newActiveResponders));
        return {
          ...prev,
          activeResponders: newActiveResponders
        };
      });

      // Check if we should trigger another round after a delay
      setTimeout(() => {
        checkForNextRound(chatId, enabledPlatforms);
      }, 2000);
      
    } catch (error) {
      console.error(`Error calling ${platform.name}:`, error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: `❌ Error from ${platform.name}: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      
      addMessage(chatId, errorMessage);

      // Remove from active responders even on error
      setDiscussionState(prev => {
        const newActiveResponders = new Set(prev.activeResponders);
        newActiveResponders.delete(platform.id);
        console.log(`${platform.name} error. Remaining responders:`, Array.from(newActiveResponders));
        return {
          ...prev,
          activeResponders: newActiveResponders
        };
      });
    }
  }, [callAIAPI, addMessage, getCurrentChat]);

  const checkForNextRound = useCallback((chatId: string, enabledPlatforms: AIPlatform[]) => {
    setDiscussionState(prev => {
      console.log('Checking for next round. Current state:', {
        isActive: prev.isActive,
        roundCount: prev.roundCount,
        maxRounds: prev.maxRounds,
        activeResponders: prev.activeResponders.size
      });

      // If discussion is not active or we've reached max rounds, stop
      if (!prev.isActive || prev.roundCount >= prev.maxRounds) {
        console.log('Discussion finished: max rounds reached or not active');
        return prev;
      }

      // If there are still active responders, wait
      if (prev.activeResponders.size > 0) {
        console.log('Still waiting for active responders');
        return prev;
      }

      // Check if there are recent messages that might trigger responses
      const currentChat = getCurrentChat();
      if (!currentChat) {
        console.log('No current chat for next round check');
        return prev;
      }

      const recentMessages = currentChat.messages.slice(-3);
      const hasRecentAIMessages = recentMessages.some(msg => 
        msg.sender === 'ai' && 
        Date.now() - msg.timestamp.getTime() < 10000
      );

      if (hasRecentAIMessages && Math.random() > 0.3) { // 70% chance to continue
        console.log(`Starting discussion round ${prev.roundCount + 1}`);
        
        // Start next round with a subset of platforms
        const activeAgents = enabledPlatforms.filter(() => Math.random() > 0.4);
        
        if (activeAgents.length > 0) {
          console.log('Next round participants:', activeAgents.map(p => p.name));
          
          activeAgents.forEach(platform => {
            setTimeout(() => {
              processAIResponse(chatId, platform, enabledPlatforms);
            }, Math.random() * 3000); // Random delay 0-3 seconds
          });

          return {
            ...prev,
            roundCount: prev.roundCount + 1,
            activeResponders: new Set(activeAgents.map(p => p.id))
          };
        }
      } else {
        console.log('Discussion naturally concluded');
      }

      return prev;
    });
  }, [getCurrentChat, processAIResponse]);

  const stopDiscussion = useCallback(() => {
    console.log('Stopping discussion...');
    
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

    console.log('Discussion stopped');
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
