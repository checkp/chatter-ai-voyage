
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Message, AIPlatform } from '@/types/chat';

export const useConductorChat = (
  user: any,
  conductorPlatform: AIPlatform | null,
  activeChatId: string | null,
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>
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

      // Get conductor response
      const conversationHistory = [...conductorMessages, userMessage];
      
      // Enhanced conductor prompt that explains their role
      const conductorPrompt = `You are a conductor AI managing a multi-AI discussion system. Your role is to:

1. Directly answer user questions when you can handle them yourself
2. Consult with other specialized AIs when their expertise would be valuable
3. Synthesize responses from multiple AIs into coherent, helpful answers
4. Manage the flow of conversation and decide when to involve other AIs

Available AIs you can consult with:
- OpenAI (general purpose, reasoning, coding)
- Claude (analysis, writing, complex reasoning)
- Gemini (multimodal, research, creative tasks)
- Grok (conversational, current events, creative responses)
- DeepSeek (coding, technical analysis, problem-solving)

User question: ${content}

Please respond directly to the user. If you need to consult other AIs, indicate that you're doing so and then provide a comprehensive response that incorporates insights from the relevant AIs.`;

      const aiResponse = await callAIAPI(
        conductorPlatform,
        [{
          ...userMessage,
          content: conductorPrompt
        }],
        [conductorPlatform]
      );

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
