
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
      // Create a separate conductor conversation ID as a proper UUID
      const conductorConversationId = generateChatId();
      
      console.log('Processing conductor message:', {
        originalChatId: chatId,
        conductorConversationId,
        userMessage: userMessage.substring(0, 50) + '...'
      });

      // Step 1: Add user message to conductor conversation
      const userMsgObj: Message = {
        id: generateChatId(),
        content: userMessage,
        sender: 'user',
        created_at: new Date().toISOString(),
        conversation_id: conductorConversationId,
        timestamp: new Date()
      };

      // Save user message to database with conductor conversation ID
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert([{
          id: userMsgObj.id,
          content: userMsgObj.content,
          sender: userMsgObj.sender,
          conversation_id: conductorConversationId,
          created_at: userMsgObj.created_at
        }]);

      if (userMsgError) {
        console.error('Error saving user message to conductor:', userMsgError);
      }

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
          conversation_id: conductorConversationId,
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
        conversation_id: conductorConversationId,
        timestamp: new Date()
      };

      // Save conductor message to database
      const { error: conductorMsgError } = await supabase
        .from('messages')
        .insert([{
          id: conductorMsgObj.id,
          content: conductorMsgObj.content,
          sender: conductorMsgObj.sender,
          platform: conductorMsgObj.platform,
          conversation_id: conductorConversationId,
          created_at: conductorMsgObj.created_at
        }]);

      if (conductorMsgError) {
        console.error('Error saving conductor message:', conductorMsgError);
      }

      // Step 3: Send optimized message to enabled AI agents in main chat
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
      
      // Add user message to main chat first
      const mainUserMsgObj: Message = {
        id: generateChatId(),
        content: userMessage,
        sender: 'user',
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date()
      };

      // Save user message to main chat
      const { error: mainUserMsgError } = await supabase
        .from('messages')
        .insert([{
          id: mainUserMsgObj.id,
          content: mainUserMsgObj.content,
          sender: mainUserMsgObj.sender,
          conversation_id: chatId,
          created_at: mainUserMsgObj.created_at
        }]);

      if (mainUserMsgError) {
        console.error('Error saving user message to main chat:', mainUserMsgError);
      }

      const agentPromises = enabledPlatforms.map(async (platform) => {
        try {
          const optimizedPrompt = `${userMessage}\n\n[Note: This message has been processed by our Conductor AI for optimal response coordination]`;
          
          const updatedMainMessages = [...mainMessages, mainUserMsgObj];
          
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
            conversation_id: conductorConversationId,
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
          conversation_id: conductorConversationId,
          timestamp: new Date()
        };

        // Save summary message to conductor conversation
        const { error: summaryMsgError } = await supabase
          .from('messages')
          .insert([{
            id: summaryMsgObj.id,
            content: summaryMsgObj.content,
            sender: summaryMsgObj.sender,
            platform: summaryMsgObj.platform,
            conversation_id: conductorConversationId,
            created_at: summaryMsgObj.created_at
          }]);

        if (summaryMsgError) {
          console.error('Error saving summary message:', summaryMsgError);
        }

        // Save agent responses to main chat
        if (agentResponses.length > 0) {
          const { error: agentMsgError } = await supabase
            .from('messages')
            .insert(agentResponses.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender,
              platform: msg.platform,
              conversation_id: msg.conversation_id,
              created_at: msg.created_at
            })));

          if (agentMsgError) {
            console.error('Error saving agent messages:', agentMsgError);
          }
        }

        // Update query cache for both conversations
        queryClient.invalidateQueries({ queryKey: ['messages', conductorConversationId] });
        queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
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
