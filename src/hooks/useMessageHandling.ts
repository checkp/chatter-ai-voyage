
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIPlatform } from '@/types/chat';

export const useMessageHandling = (user: any, platforms: AIPlatform[], callAIAPI: any) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [processingSentMessageId, setProcessingSentMessageId] = useState<string | null>(null);
  const [activeAIStatuses, setActiveAIStatuses] = useState<Record<string, 'thinking' | 'responding' | 'completed' | 'error'>>({});

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string, content: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const newMessageId = uuidv4();
      const timestamp = new Date().toISOString();

      console.log('Saving user message to database:', newMessageId);

      // Save user message to database
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert([{
          id: newMessageId,
          conversation_id: chatId,
          content,
          sender: 'user',
          created_at: timestamp,
          platform: null,
        }]);

      if (userMessageError) {
        console.error('Error sending message:', userMessageError);
        throw userMessageError;
      }

      return { chatId, content, newMessageId, timestamp };
    },
    onSuccess: async ({ chatId, content, newMessageId, timestamp }) => {
      console.log('User message saved, processing AI responses for message:', newMessageId);
      setProcessingSentMessageId(newMessageId);
      
      // Refresh messages to show the user message immediately
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      
      // Call all enabled AI APIs in parallel
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
      if (enabledPlatforms.length === 0) {
        toast.error('No AI agents enabled. Please enable at least one agent in settings.');
        setProcessingSentMessageId(null);
        return;
      }

      setIsLoadingResponse(true);

      // Initialize AI statuses
      const initialStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'> = {};
      enabledPlatforms.forEach(platform => {
        initialStatuses[platform.id] = 'thinking';
      });
      setActiveAIStatuses(initialStatuses);

      try {
        // Get current messages for context
        const { data: currentMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', chatId)
          .order('created_at', { ascending: true });

        const messageHistory = (currentMessages || []).map(msg => ({
          ...msg,
          sender: msg.sender as 'user' | 'ai',
          timestamp: new Date(msg.created_at),
          status: 'sent' as const,
          seenBy: []
        }));

        const aiResponses = await Promise.all(
          enabledPlatforms.map(async (platform) => {
            try {
              console.log(`Calling ${platform.name} API...`);
              setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'responding' }));
              
              const aiContent = await callAIAPI(platform, messageHistory, platforms);
              
              setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'completed' }));
              return { platformId: platform.id, content: aiContent, success: true };
            } catch (apiError: any) {
              console.error(`Error calling ${platform.name} API:`, apiError);
              toast.error(`Error calling ${platform.name} API: ${apiError.message}`);
              setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'error' }));
              return { platformId: platform.id, content: `Error: ${apiError.message}`, success: false };
            }
          })
        );

        // Save AI responses to database in batch
        if (aiResponses.length > 0) {
          const aiMessageInserts = aiResponses.map(({ platformId, content }) => ({
            id: uuidv4(),
            conversation_id: chatId,
            content,
            sender: 'ai',
            created_at: new Date().toISOString(),
            platform: platformId,
          }));

          console.log('Saving AI responses to database:', aiMessageInserts.length, 'messages');
          const { error: aiMessageError } = await supabase
            .from('messages')
            .insert(aiMessageInserts);

          if (aiMessageError) {
            console.error('Error saving AI messages:', aiMessageError);
            toast.error('Error saving AI messages: ' + aiMessageError.message);
          } else {
            console.log('AI responses saved successfully');
            // Refresh messages to show AI responses
            await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
            const successfulResponses = aiResponses.filter(r => r.success).length;
            if (successfulResponses > 0) {
              toast.success(`${successfulResponses} AI responses received`);
            }
          }
        }
      } finally {
        setIsLoadingResponse(false);
        setProcessingSentMessageId(null);
        // Clear statuses after a delay
        setTimeout(() => setActiveAIStatuses({}), 2000);
      }
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + error.message);
      setProcessingSentMessageId(null);
      setActiveAIStatuses({});
    },
  });

  const handleSend = async (activeChatId: string | null) => {
    if (!input.trim() || !activeChatId || sendMessageMutation.isPending) {
      console.log('Cannot send message:', { 
        hasInput: !!input.trim(), 
        hasActiveChat: !!activeChatId, 
        isPending: sendMessageMutation.isPending 
      });
      return;
    }
    
    const content = input.trim();
    setInput('');

    console.log('Sending message:', content);
    try {
      await sendMessageMutation.mutateAsync({ chatId: activeChatId, content });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + error.message);
      // Restore input on error
      setInput(content);
    }
  };

  return {
    input,
    setInput,
    isLoadingResponse,
    activeAIStatuses,
    sendMessageMutation,
    handleSend
  };
};
