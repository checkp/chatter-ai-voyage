
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { AIPlatform } from '@/types/chat';

export const useFreeMode = () => {
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [freeModeMessageLimit, setFreeModeMessageLimit] = useState(100);
  const [freeModeMessageCount, setFreeModeMessageCount] = useState(0);
  const [isFreeModeRunning, setIsFreeModeRunning] = useState(false);
  const freeModeRunningRef = useRef(false);

  const startFreeMode = useCallback(async (
    activeChatId: string | null,
    platforms: AIPlatform[],
    callAIAPI: any,
    sendSingleAgentMessage: any
  ) => {
    if (!activeChatId) {
      toast.error('Please select a chat to start conversation mode');
      return;
    }

    const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
    if (enabledPlatforms.length < 2) {
      toast.error('Need at least 2 enabled AI agents for conversation mode');
      return;
    }

    setIsFreeMode(true);
    setIsFreeModeRunning(true);
    freeModeRunningRef.current = true;
    setFreeModeMessageCount(0);
    
    toast.success(`Conversation mode started! Agents will discuss for up to ${freeModeMessageLimit} messages.`);

    // Start the autonomous conversation in a separate execution context
    setTimeout(async () => {
      try {
        await runFreeModeConversation(activeChatId, enabledPlatforms, callAIAPI, sendSingleAgentMessage);
      } catch (error) {
        console.error('Error in conversation mode:', error);
        toast.error('Conversation mode encountered an error');
        stopFreeMode();
      }
    }, 100);
  }, [freeModeMessageLimit]);

  const stopFreeMode = useCallback(() => {
    freeModeRunningRef.current = false;
    setIsFreeMode(false);
    setIsFreeModeRunning(false);
    toast.info(`Conversation mode stopped. ${freeModeMessageCount} messages generated.`);
  }, [freeModeMessageCount]);

  const runFreeModeConversation = async (
    chatId: string,
    enabledPlatforms: AIPlatform[],
    callAIAPI: any,
    sendSingleAgentMessage: any
  ) => {
    let currentMessageCount = 0;
    let currentPlatformIndex = 0;
    
    while (currentMessageCount < freeModeMessageLimit && freeModeRunningRef.current) {
      const currentPlatform = enabledPlatforms[currentPlatformIndex];
      
      try {
        console.log(`Conversation mode: Processing message ${currentMessageCount + 1}/${freeModeMessageLimit} with ${currentPlatform.name}`);
        
        // Let the AI respond naturally to the existing conversation without any prompting
        await sendSingleAgentMessage(chatId, '', currentPlatform.id);

        currentMessageCount++;
        setFreeModeMessageCount(currentMessageCount);

        // Move to next platform
        currentPlatformIndex = (currentPlatformIndex + 1) % enabledPlatforms.length;

        // Add a delay between messages to prevent overwhelming the APIs and allow for proper processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if we should stop (using ref for immediate check)
        if (!freeModeRunningRef.current) {
          console.log('Conversation mode stopped by user');
          break;
        }

      } catch (error) {
        console.error(`Error with ${currentPlatform.name} in conversation mode:`, error);
        // Skip this agent and continue with the next one
        currentPlatformIndex = (currentPlatformIndex + 1) % enabledPlatforms.length;
        
        // Still count this as an attempt to prevent infinite loops
        currentMessageCount++;
        setFreeModeMessageCount(currentMessageCount);
      }
    }

    // Stop conversation mode when limit reached or error occurred
    if (currentMessageCount >= freeModeMessageLimit) {
      toast.success(`Conversation mode completed! Reached the limit of ${freeModeMessageLimit} messages.`);
    }
    
    freeModeRunningRef.current = false;
    setIsFreeMode(false);
    setIsFreeModeRunning(false);
  };

  const updateMessageLimit = useCallback((newLimit: number) => {
    if (newLimit > 0 && newLimit <= 1000) {
      setFreeModeMessageLimit(newLimit);
    }
  }, []);

  return {
    isFreeMode,
    freeModeMessageLimit,
    freeModeMessageCount,
    isFreeModeRunning,
    startFreeMode,
    stopFreeMode,
    updateMessageLimit
  };
};
