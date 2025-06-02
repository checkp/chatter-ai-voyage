import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIPlatform } from '@/types/chat';
import { useMessageQueue } from './useMessageQueue';
import { useTokens } from './useTokens';

const generateChatTitle = (message: string): string => {
  // Remove extra whitespace and limit length
  const cleanMessage = message.trim();
  
  // If message is short enough, use it as is
  if (cleanMessage.length <= 50) {
    return cleanMessage;
  }
  
  // Try to find a natural break point (sentence end, comma, etc.)
  const sentences = cleanMessage.split(/[.!?]+/);
  if (sentences[0] && sentences[0].length <= 50) {
    return sentences[0].trim();
  }
  
  // Try to break at word boundaries
  const words = cleanMessage.split(' ');
  let title = '';
  for (const word of words) {
    if ((title + ' ' + word).length > 47) { // Leave room for "..."
      break;
    }
    title += (title ? ' ' : '') + word;
  }
  
  return title ? title + '...' : cleanMessage.substring(0, 47) + '...';
};

export const useMessageHandling = (user: any, platforms: AIPlatform[], callAIAPI: any) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [processingSentMessageId, setProcessingSentMessageId] = useState<string | null>(null);
  const [activeAIStatuses, setActiveAIStatuses] = useState<Record<string, 'thinking' | 'responding' | 'completed' | 'error'>>({});

  const { calculateTokenCost, checkTokenBalance } = useTokens(user);

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
      if (!user?.id) {
        console.error('User not authenticated');
        throw new Error('User not authenticated');
      }

      // Check token balance before proceeding
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
      const requiredTokens = await calculateTokenCost(enabledPlatforms);
      
      console.log('Required tokens for message:', requiredTokens);
      
      if (requiredTokens > 0) {
        const hasEnoughTokens = await checkTokenBalance(requiredTokens);
        if (!hasEnoughTokens) {
          throw new Error(`Insufficient tokens. You need ${requiredTokens} tokens but don't have enough. Please purchase more tokens.`);
        }
      }

      const newMessageId = uuidv4();
      const timestamp = new Date().toISOString();

      console.log('Attempting to save user message:', { newMessageId, chatId, content: content.substring(0, 50) + '...' });

      try {
        // First, verify the conversation exists and belongs to the user
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('id, user_id, title')
          .eq('id', chatId)
          .eq('user_id', user.id)
          .single();

        if (convError) {
          console.error('Error verifying conversation:', convError);
          throw new Error('Conversation not found or access denied');
        }

        console.log('Conversation verified:', conversation);

        // Check if this is the first message (title is still "New Chat")
        const isFirstMessage = conversation.title === 'New Chat';

        // Save user message to database - this is from general chat (visible to all agents)
        const { data: messageData, error: userMessageError } = await supabase
          .from('messages')
          .insert([{
            id: newMessageId,
            conversation_id: chatId,
            content,
            sender: 'user',
            created_at: timestamp,
            platform: null, // null means it's a general message visible to all agents
          }])
          .select()
          .single();

        if (userMessageError) {
          console.error('Error saving user message:', userMessageError);
          throw userMessageError;
        }

        console.log('User message saved successfully:', messageData);

        // Update chat title if this is the first message
        if (isFirstMessage) {
          const newTitle = generateChatTitle(content);
          console.log('Updating chat title to:', newTitle);
          
          const { error: titleUpdateError } = await supabase
            .from('conversations')
            .update({ title: newTitle, updated_at: new Date().toISOString() })
            .eq('id', chatId)
            .eq('user_id', user.id);

          if (titleUpdateError) {
            console.error('Error updating chat title:', titleUpdateError);
            // Don't throw here, title update is not critical
          } else {
            console.log('Chat title updated successfully');
            // Refresh conversations to show the new title
            queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
          }
        }

        return { chatId, content, newMessageId, timestamp };

      } catch (error) {
        console.error('Failed to save message:', error);
        throw error;
      }
    },
    onSuccess: async ({ chatId, content, newMessageId, timestamp }) => {
      console.log('User message saved successfully, starting AI processing for message:', newMessageId);
      setProcessingSentMessageId(newMessageId);
      
      try {
        // Refresh messages to show the user message immediately
        await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        console.log('Messages refreshed after user message');
        
        // Process AI responses
        const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
        if (enabledPlatforms.length === 0) {
          toast.error('No AI agents enabled. Please enable at least one agent in settings.');
          setProcessingSentMessageId(null);
          return;
        }

        console.log('Starting AI processing for platforms:', enabledPlatforms.map(p => p.name));
        setIsLoadingResponse(true);

        // Initialize AI statuses
        const initialStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'> = {};
        enabledPlatforms.forEach(platform => {
          initialStatuses[platform.id] = 'thinking';
        });
        setActiveAIStatuses(initialStatuses);

        // Process each AI response sequentially to avoid loops
        await processAIResponses(chatId, content, enabledPlatforms);

      } catch (error) {
        console.error('Error during AI processing setup:', error);
        setProcessingSentMessageId(null);
        setActiveAIStatuses({});
        setIsLoadingResponse(false);
      }
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
      setProcessingSentMessageId(null);
      setActiveAIStatuses({});
      setIsLoadingResponse(false);
    },
  });

  const processAIResponses = async (chatId: string, originalContent: string, enabledPlatforms: AIPlatform[]) => {
    try {
      for (const platform of enabledPlatforms) {
        if (shouldStop) {
          console.log('Stop signal received, halting AI processing');
          break;
        }

        console.log(`Processing AI response for ${platform.name}`);
        setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'responding' }));

        try {
          // Get current messages for context
          const { data: currentMessages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', chatId)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error fetching messages for AI context:', messagesError);
            throw messagesError;
          }

          const messageHistory = (currentMessages || []).map(msg => ({
            ...msg,
            sender: msg.sender as 'user' | 'ai',
            timestamp: new Date(msg.created_at),
            status: 'sent' as const,
            seenBy: []
          }));

          console.log(`Calling AI API for ${platform.name} with ${messageHistory.length} messages`);
          const aiContent = await callAIAPI(platform, messageHistory, enabledPlatforms);
          console.log(`AI response received from ${platform.name}:`, aiContent.substring(0, 100) + '...');
          
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
            console.error('Error saving AI response:', aiMessageError);
            throw aiMessageError;
          }

          setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'completed' }));
          console.log(`Successfully processed AI response for ${platform.name}`);

          // Refresh messages after each AI response
          await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

        } catch (error: any) {
          console.error(`Error processing AI response for ${platform.name}:`, error);
          setActiveAIStatuses(prev => ({ ...prev, [platform.id]: 'error' }));
          toast.error(`Error with ${platform.name}: ${error.message}`);
        }
      }

      // Final cleanup
      setIsLoadingResponse(false);
      setProcessingSentMessageId(null);
      
      // Clear statuses after a delay
      setTimeout(() => setActiveAIStatuses({}), 2000);
      
      const successfulResponses = enabledPlatforms.filter(p => 
        activeAIStatuses[p.id] === 'completed'
      ).length;
      
      if (successfulResponses > 0) {
        toast.success(`${successfulResponses} AI agent${successfulResponses > 1 ? 's' : ''} responded successfully`);
      }

      // Refresh token balance after AI responses
      queryClient.invalidateQueries({ queryKey: ['tokens', user?.id] });

    } catch (error: any) {
      console.error('Error in AI response processing:', error);
      toast.error('Error processing AI responses: ' + error.message);
      setIsLoadingResponse(false);
      setProcessingSentMessageId(null);
      setActiveAIStatuses({});
    }
  };

  const sendSingleAgentMessage = async (chatId: string, content: string, platformId: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const platform = platforms.find(p => p.id === platformId);
    if (!platform || !platform.enabled || !platform.hasApiKey) {
      toast.error('Selected AI agent is not available');
      return;
    }

    try {
      // Check token balance for single platform
      const requiredTokens = await calculateTokenCost([platform]);
      const hasEnoughTokens = await checkTokenBalance(requiredTokens);
      
      if (!hasEnoughTokens) {
        toast.error(`Insufficient tokens. You need ${requiredTokens} tokens.`);
        return;
      }

      const newMessageId = uuidv4();
      const timestamp = new Date().toISOString();

      console.log('Saving user message for single agent:', newMessageId, 'platform:', platformId);

      // Save user message to database with platform ID to make it private to this agent
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert([{
          id: newMessageId,
          conversation_id: chatId,
          content,
          sender: 'user',
          created_at: timestamp,
          platform: platformId, // Set platform ID to make this message private to this agent
        }]);

      if (userMessageError) {
        console.error('Error sending message:', userMessageError);
        throw userMessageError;
      }

      // Refresh messages to show the user message immediately
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      await queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      console.log('Messages refreshed after user message from agent dialog');

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
      
      // Refresh messages again to show the AI response
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      await queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      console.log('Messages refreshed after AI response from agent dialog');

      // Refresh token balance
      queryClient.invalidateQueries({ queryKey: ['tokens', user?.id] });

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

    console.log('Sending message:', content.substring(0, 100) + '...');
    try {
      await sendMessageMutation.mutateAsync({ chatId: activeChatId, content });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
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
    canStop: isLoadingResponse,
    sendSingleAgentMessage
  };
};
