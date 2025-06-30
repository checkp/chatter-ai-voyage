
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import { processConductorMessageFlow } from '@/services/conductorProcessingService';

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
    mainMessages: Message[],
    conductorConversationId: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsProcessing(true);

    try {
      const result = await processConductorMessageFlow({
        chatId,
        userMessage,
        conductorMessages,
        mainMessages,
        platforms,
        conductorAgent,
        conductorConversationId,
        callAIAPI
      });

      // Update query cache for both conversations
      queryClient.invalidateQueries({ queryKey: ['conductor_messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

      return result;
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
