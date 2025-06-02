
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { AIPlatform } from '@/types/chat';

export const useFreeMode = () => {
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [freeModeMessageLimit, setFreeModeMessageLimit] = useState(100);
  const [freeModeMessageCount, setFreeModeMessageCount] = useState(0);
  const [isFreeModeRunning, setIsFreeModeRunning] = useState(false);

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
    setFreeModeMessageCount(0);
    
    toast.success(`Free mode started! Agents will discuss for up to ${freeModeMessageLimit} messages.`);

    // Start the autonomous conversation
    try {
      await runFreeModeConversation(activeChatId, enabledPlatforms, callAIAPI, sendSingleAgentMessage);
    } catch (error) {
      console.error('Error in free mode:', error);
      toast.error('Free mode encountered an error');
      stopFreeMode();
    }
  }, [freeModeMessageLimit]);

  const stopFreeMode = useCallback(() => {
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
    
    while (currentMessageCount < freeModeMessageLimit && isFreeModeRunning) {
      const currentPlatform = enabledPlatforms[currentPlatformIndex];
      
      try {
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

        // Add a small delay between messages to prevent overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if we should stop
        if (!isFreeModeRunning) break;

      } catch (error) {
        console.error(`Error with ${currentPlatform.name} in free mode:`, error);
        // Skip this agent and continue with the next one
        currentPlatformIndex = (currentPlatformIndex + 1) % enabledPlatforms.length;
      }
    }

    // Stop free mode when limit reached or error occurred
    if (currentMessageCount >= freeModeMessageLimit) {
      toast.success(`Free mode completed! Reached the limit of ${freeModeMessageLimit} messages.`);
    }
    
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
