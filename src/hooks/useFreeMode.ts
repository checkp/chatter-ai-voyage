
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
      toast.error('Please select a chat to start free mode');
      return;
    }

    const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
    if (enabledPlatforms.length < 2) {
      toast.error('Need at least 2 enabled AI agents for free mode');
      return;
    }

    setIsFreeMode(true);
    setIsFreeModeRunning(true);
    freeModeRunningRef.current = true;
    setFreeModeMessageCount(0);
    
    toast.success(`Free mode started! Agents will discuss for up to ${freeModeMessageLimit} messages.`);

    // Start the autonomous conversation in a separate execution context
    setTimeout(async () => {
      try {
        await runFreeModeConversation(activeChatId, enabledPlatforms, callAIAPI, sendSingleAgentMessage);
      } catch (error) {
        console.error('Error in free mode:', error);
        toast.error('Free mode encountered an error');
        stopFreeMode();
      }
    }, 100);
  }, [freeModeMessageLimit]);

  const stopFreeMode = useCallback(() => {
    freeModeRunningRef.current = false;
    setIsFreeMode(false);
    setIsFreeModeRunning(false);
    toast.info(`Free mode stopped. ${freeModeMessageCount} messages generated.`);
  }, [freeModeMessageCount]);

  const runFreeModeConversation = async (
    chatId: string,
    enabledPlatforms: AIPlatform[],
    callAIAPI: any,
    sendSingleAgentMessage: any
  ) => {
    let currentMessageCount = 0;
    let currentPlatformIndex = 0;

    // Start with an opening statement from the first agent
    const openingPrompts = [
      "Let's have an interesting discussion! What topic would you all like to explore today?",
      "I'm curious about everyone's thoughts on the future of technology. What are your perspectives?",
      "Let's discuss something fascinating. What's been on your minds lately?",
      "I'd love to hear different viewpoints on innovation and creativity. What do you all think?",
      "Let's have a collaborative conversation about ideas that inspire us. Who wants to start?"
    ];

    const randomOpening = openingPrompts[Math.floor(Math.random() * openingPrompts.length)];
    
    while (currentMessageCount < freeModeMessageLimit && freeModeRunningRef.current) {
      const currentPlatform = enabledPlatforms[currentPlatformIndex];
      
      try {
        console.log(`Free mode: Processing message ${currentMessageCount + 1}/${freeModeMessageLimit} with ${currentPlatform.name}`);
        
        if (currentMessageCount === 0) {
          // First message is the opening prompt
          await sendSingleAgentMessage(chatId, randomOpening, currentPlatform.id);
        } else {
          // For subsequent messages, let the AI respond naturally to the conversation
          const contextPrompt = `Continue this multi-agent discussion naturally. Build upon what others have said, add your unique perspective, ask questions, or introduce related ideas. Keep the conversation flowing and engaging.`;
          await sendSingleAgentMessage(chatId, contextPrompt, currentPlatform.id);
        }

        currentMessageCount++;
        setFreeModeMessageCount(currentMessageCount);

        // Move to next platform
        currentPlatformIndex = (currentPlatformIndex + 1) % enabledPlatforms.length;

        // Add a delay between messages to prevent overwhelming the APIs and allow for proper processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if we should stop (using ref for immediate check)
        if (!freeModeRunningRef.current) {
          console.log('Free mode stopped by user');
          break;
        }

      } catch (error) {
        console.error(`Error with ${currentPlatform.name} in free mode:`, error);
        // Skip this agent and continue with the next one
        currentPlatformIndex = (currentPlatformIndex + 1) % enabledPlatforms.length;
        
        // Still count this as an attempt to prevent infinite loops
        currentMessageCount++;
        setFreeModeMessageCount(currentMessageCount);
      }
    }

    // Stop free mode when limit reached or error occurred
    if (currentMessageCount >= freeModeMessageLimit) {
      toast.success(`Free mode completed! Reached the limit of ${freeModeMessageLimit} messages.`);
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
