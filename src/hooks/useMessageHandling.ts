import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIPlatform } from '@/types/chat';
import { useMessageQueue } from './useMessageQueue';

export const useMessageHandling = (user: any, platforms: AIPlatform[], callAIAPI: any) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [processingSentMessageId, setProcessingSentMessageId] = useState<string | null>(null);
  const [activeAIStatuses, setActiveAIStatuses] = useState<Record<string, 'thinking' | 'responding' | 'completed' | 'error'>>({});

  const {
    messageQueue,
    isProcessing,
    shouldStop,
    setIsProcessing,
    addToQueue,
    updateMessageStatus,
    removeFromQueue,
    stopProcessing,
    resetStopSignal,
    getNextPendingMessage,
    getPendingCount
  } = useMessageQueue();

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
      console.log('User message saved, adding AI responses to queue for message:', newMessageId);
      setProcessingSentMessageId(newMessageId);
      
      // Refresh messages to show the user message immediately
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      
      // Add AI response processing to queue
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
      if (enabledPlatforms.length === 0) {
        toast.error('No AI agents enabled. Please enable at least one agent in settings.');
        setProcessingSentMessageId(null);
        return;
      }

      // Reset stop signal and start processing
      resetStopSignal();
      setIsLoadingResponse(true);

      // Initialize AI statuses
      const initialStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'> = {};
      enabledPlatforms.forEach(platform => {
        initialStatuses[platform.id] = 'thinking';
        // Add each AI response to the queue
        addToQueue(chatId, `AI_RESPONSE:${platform.id}:${content}`);
      });
      setActiveAIStatuses(initialStatuses);

      // Process the queue
      processMessageQueue(chatId);
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + error.message);
      setProcessingSentMessageId(null);
      setActiveAIStatuses({});
    },
  });

  const sendSingleAgentMessage = async (chatId: string, content: string, platformId: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const platform = platforms.find(p => p.id === platformId);
    if (!platform || !platform.enabled || !platform.hasApiKey) {
      toast.error('Selected AI agent is not available');
      return;
    }

    try {
      const newMessageId = uuidv4();
      const timestamp = new Date().toISOString();

      console.log('Saving user message for single agent:', newMessageId);

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

      // Refresh messages to show the user message immediately
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

      // Set AI status to thinking
      setActiveAIStatuses({ [platform.id]: 'thinking' });

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

      setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'responding' }));

      const aiContent = await callAIAPI(platform, messageHistory, [platform]);
      
      // Save AI response to database
      const { error: aiMessageError } = await supabase
        .from('messages')
        .insert([{
          id: uuidv4(),
          conversation_id: chatId,
          content: aiContent,
          sender: 'ai',
          created_at: new Date().toISOString(),
          platform: platform.id,
        }]);

      if (aiMessageError) {
        throw aiMessageError;
      }

      setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'completed' }));
      
      // Refresh messages
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

      toast.success(`${platform.name} responded successfully`);

      // Clear status after delay
      setTimeout(() => {
        setActiveAIStatuses(prev => {
          const newStatuses = { ...prev };
          delete newStatuses[platform.id];
          return newStatuses;
        });
      }, 2000);

    } catch (error: any) {
      console.error('Error sending single agent message:', error);
      setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'error' }));
      toast.error(`Error with ${platform.name}: ${error.message}`);
      
      // Clear error status after delay
      setTimeout(() => {
        setActiveAIStatuses(prev => {
          const newStatuses = { ...prev };
          delete newStatuses[platform.id];
          return newStatuses;
        });
      }, 3000);
    }
  };

  const processMessageQueue = async (chatId: string) => {
    if (isProcessing || shouldStop) {
      console.log('Queue processing already running or stopped');
      return;
    }

    setIsProcessing(true);
    console.log('Starting queue processing');

    try {
      while (!shouldStop) {
        const nextMessage = getNextPendingMessage();
        if (!nextMessage) {
          console.log('No more messages in queue');
          break;
        }

        if (shouldStop) {
          console.log('Stop signal received, halting queue processing');
          break;
        }

        console.log('Processing queued message:', nextMessage.id, nextMessage.content.substring(0, 50));
        updateMessageStatus(nextMessage.id, 'processing');

        try {
          // Parse AI response message
          if (nextMessage.content.startsWith('AI_RESPONSE:')) {
            const parts = nextMessage.content.split(':');
            const platformId = parts[1];
            const platform = platforms.find(p => p.id === platformId);
            
            if (!platform) {
              throw new Error(`Platform ${platformId} not found`);
            }

            console.log(`Processing AI response for ${platform.name}`);
            setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'responding' }));

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

            const aiContent = await callAIAPI(platform, messageHistory, platforms);
            
            // Save AI response to database
            const { error: aiMessageError } = await supabase
              .from('messages')
              .insert([{
                id: uuidv4(),
                conversation_id: chatId,
                content: aiContent,
                sender: 'ai',
                created_at: new Date().toISOString(),
                platform: platform.id,
              }]);

            if (aiMessageError) {
              throw aiMessageError;
            }

            setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'completed' }));
            console.log(`Successfully processed AI response for ${platform.name}`);
          }

          updateMessageStatus(nextMessage.id, 'completed');
          removeFromQueue(nextMessage.id);

          // Refresh messages after each successful AI response
          await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

        } catch (error: any) {
          console.error('Error processing queued message:', error);
          
          if (nextMessage.content.startsWith('AI_RESPONSE:')) {
            const parts = nextMessage.content.split(':');
            const platformId = parts[1];
            setActiveAIStatuses(prev => ({ ...prev, [platformId]: 'error' }));
          }

          updateMessageStatus(nextMessage.id, 'failed');
          toast.error(`Error processing message: ${error.message}`);
          
          // Remove failed message from queue
          removeFromQueue(nextMessage.id);
        }
      }

      // Final refresh after all processing is complete
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      
      if (shouldStop) {
        toast.info('Message processing stopped by user');
      } else {
        const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
        const successfulResponses = enabledPlatforms.filter(p => 
          activeAIStatuses[p.id] === 'completed'
        ).length;
        
        if (successfulResponses > 0) {
          toast.success(`${successfulResponses} AI responses received`);
        }
      }

    } finally {
      setIsProcessing(false);
      setIsLoadingResponse(false);
      setProcessingSentMessageId(null);
      
      // Clear statuses after a delay
      setTimeout(() => setActiveAIStatuses({}), 2000);
    }
  };

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

  const handleStop = () => {
    console.log('Stop button clicked');
    stopProcessing();
    setIsLoadingResponse(false);
  };

  return {
    input,
    setInput,
    isLoadingResponse,
    activeAIStatuses,
    sendMessageMutation,
    handleSend,
    handleStop,
    messageQueue,
    getPendingCount: getPendingCount(),
    canStop: isProcessing && !shouldStop,
    sendSingleAgentMessage
  };
};
