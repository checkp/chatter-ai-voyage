
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import { generateChatId } from '@/utils/chatUtils';

export const useConductorMode = (
  user: SupabaseUser | null,
  platforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>
) => {
  const [conductorAgent, setConductorAgent] = useState('openai');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processConductorMessage = useCallback(async (
    chatId: string,
    userMessage: string,
    conductorMessages: Message[],
    mainMessages: Message[]
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsProcessing(true);

    try {
      // Step 1: Add user message to conductor conversation
      const userMsgObj: Message = {
        id: generateChatId(),
        content: userMessage,
        sender: 'user',
        created_at: new Date().toISOString(),
        conversation_id: `${chatId}_conductor`,
        timestamp: new Date()
      };

      const updatedConductorMessages = [...conductorMessages, userMsgObj];

      // Step 2: Get conductor's processing response
      const conductorPlatform = platforms.find(p => p.id === conductorAgent);
      if (!conductorPlatform) throw new Error('Conductor platform not found');

      const conductorPrompt = `You are the Conductor AI, an orchestrator of multi-AI conversations. Your role is to:

1. Analyze the user's message: "${userMessage}"
2. Translate it into optimal prompts for different AI agents
3. Coordinate their responses
4. Provide a synthesized summary

Available AI agents: ${platforms.filter(p => p.enabled).map(p => p.name).join(', ')}

First, acknowledge the user's request and explain how you'll process it with the AI agents.`;

      const conductorResponse = await callAIAPI(
        conductorPlatform,
        [...updatedConductorMessages, {
          id: generateChatId(),
          content: conductorPrompt,
          sender: 'ai',
          platform: 'system',
          created_at: new Date().toISOString(),
          conversation_id: `${chatId}_conductor`,
          timestamp: new Date()
        }],
        [conductorPlatform]
      );

      // Add conductor's initial response
      const conductorMsgObj: Message = {
        id: generateChatId(),
        content: conductorResponse,
        sender: 'ai',
        platform: conductorAgent,
        created_at: new Date().toISOString(),
        conversation_id: `${chatId}_conductor`,
        timestamp: new Date()
      };

      // Step 3: Send optimized message to enabled AI agents
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
      const agentPromises = enabledPlatforms.map(async (platform) => {
        try {
          const optimizedPrompt = `${userMessage}\n\n[Note: This message has been processed by our Conductor AI for optimal response coordination]`;
          
          const response = await callAIAPI(platform, [{
            id: generateChatId(),
            content: optimizedPrompt,
            sender: 'user',
            created_at: new Date().toISOString(),
            conversation_id: chatId,
            timestamp: new Date()
          }], enabledPlatforms);

          return {
            id: generateChatId(),
            content: response,
            sender: 'ai' as const,
            platform: platform.id,
            created_at: new Date().toISOString(),
            conversation_id: chatId,
            timestamp: new Date()
          };
        } catch (error) {
          console.error(`Error calling ${platform.name}:`, error);
          return null;
        }
      });

      const agentResponses = (await Promise.allSettled(agentPromises))
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<Message>).value);

      // Step 4: Conductor summarizes agent responses
      if (agentResponses.length > 0) {
        const summaryPrompt = `Now summarize and synthesize these responses from the AI agents:

${agentResponses.map(msg => `${platforms.find(p => p.id === msg.platform)?.name}: ${msg.content}`).join('\n\n')}

Provide a coherent, synthesized response that captures the best insights from all agents.`;

        const summaryResponse = await callAIAPI(
          conductorPlatform,
          [...updatedConductorMessages, conductorMsgObj, {
            id: generateChatId(),
            content: summaryPrompt,
            sender: 'user',
            created_at: new Date().toISOString(),
            conversation_id: `${chatId}_conductor`,
            timestamp: new Date()
          }],
          [conductorPlatform]
        );

        const summaryMsgObj: Message = {
          id: generateChatId(),
          content: summaryResponse,
          sender: 'ai',
          platform: conductorAgent,
          created_at: new Date().toISOString(),
          conversation_id: `${chatId}_conductor`,
          timestamp: new Date()
        };

        // Update query cache
        queryClient.setQueryData(['messages', `${chatId}_conductor`], [
          ...updatedConductorMessages,
          conductorMsgObj,
          summaryMsgObj
        ]);

        queryClient.setQueryData(['messages', chatId], [
          ...mainMessages,
          ...agentResponses
        ]);

        // Save to database
        await Promise.all([
          supabase.from('messages').insert([
            { ...userMsgObj, conversation_id: `${chatId}_conductor` },
            { ...conductorMsgObj },
            { ...summaryMsgObj }
          ]),
          supabase.from('messages').insert(agentResponses.map(msg => ({ ...msg })))
        ]);
      }

      return { conductorMessages: updatedConductorMessages, agentResponses };
    } catch (error) {
      console.error('Conductor processing error:', error);
      toast.error('Failed to process conductor request');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [user, platforms, conductorAgent, callAIAPI, queryClient]);

  return {
    conductorAgent,
    setConductorAgent,
    isProcessing,
    processConductorMessage
  };
};
