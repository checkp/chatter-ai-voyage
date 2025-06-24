
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Message, AIPlatform } from '@/types/chat';

export const useConductorChat = (
  user: any,
  conductorPlatform: AIPlatform | null,
  activeChatId: string | null,
  platforms: AIPlatform[]
) => {
  const [conductorMessages, setConductorMessages] = useState<Message[]>([]);
  const [isLoadingConductor, setIsLoadingConductor] = useState(false);
  const queryClient = useQueryClient();

  const addConductorMessage = useCallback(async (chatId: string, message: Message) => {
    const { error } = await supabase
      .from('messages')
      .insert([{
        content: message.content,
        sender: message.sender,
        platform: message.platform,
        conversation_id: chatId
      }]);

    if (error) {
      console.error('Error saving conductor message:', error);
      throw error;
    }

    setConductorMessages(prev => [...prev, message]);
    
    // Invalidate the messages query to refresh the main chat
    queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
  }, [queryClient]);

  const sendConductorMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChatId || !conductorPlatform || !user) {
        throw new Error('Missing required data for conductor message');
      }

      setIsLoadingConductor(true);

      // Create user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content,
        sender: 'user',
        created_at: new Date().toISOString(),
        conversation_id: activeChatId,
        timestamp: new Date()
      };

      // Add user message to conductor chat
      await addConductorMessage(activeChatId, userMessage);

      // Get conductor response (simplified for now)
      const aiResponse = `I'm the conductor AI (${conductorPlatform.name}). I'll help coordinate the discussion and bring in other AIs as needed. Your message: "${content}"`;

      // Create AI response message
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: aiResponse,
        sender: 'ai',
        platform: conductorPlatform.id,
        created_at: new Date().toISOString(),
        conversation_id: activeChatId,
        timestamp: new Date()
      };

      // Add AI response to conductor chat
      await addConductorMessage(activeChatId, aiMessage);

      return aiMessage;
    },
    onError: (error: any) => {
      console.error('Failed to send conductor message:', error);
      toast.error('Failed to send message to conductor');
      setIsLoadingConductor(false);
    },
    onSettled: () => {
      setIsLoadingConductor(false);
    }
  });

  const resetConductorChat = useCallback(() => {
    setConductorMessages([]);
  }, []);

  return {
    conductorMessages,
    isLoadingConductor,
    sendConductorMessage: sendConductorMessage.mutate,
    resetConductorChat
  };
};
