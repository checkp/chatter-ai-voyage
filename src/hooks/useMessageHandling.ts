
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message, ChatMode } from '@/types/chat';
import { generateChatId } from '@/utils/chatUtils';
import { useTokens } from '@/hooks/useTokens';
import { useActivityLog } from '@/contexts/ActivityLogContext';

export const useMessageHandling = (
  user: SupabaseUser | null, 
  platforms: AIPlatform[], 
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[], chatMode?: ChatMode) => Promise<string>,
  chatMode: ChatMode = 'discussion'
) => {
  const [input, setInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [activeAIStatuses, setActiveAIStatuses] = useState<Record<string, boolean>>({});
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [canStop, setCanStop] = useState(false);
  
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const { tokenBalance, checkTokenBalance, calculateTokenCost } = useTokens(user);

  const updateActiveStatus = useCallback((platformId: string, isActive: boolean) => {
    setActiveAIStatuses(prev => ({
      ...prev,
      [platformId]: isActive
    }));
  }, []);

  const getPendingCount = useCallback(() => {
    return Object.values(activeAIStatuses).filter(Boolean).length;
  }, [activeAIStatuses]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, userMessage }: { chatId: string; userMessage: string }) => {
      if (!user) throw new Error('User not authenticated');

      console.log('=== SEND MESSAGE MUTATION START ===');
      console.log('Chat ID:', chatId);
      console.log('User message:', userMessage);
      console.log('Chat mode:', chatMode);

      // Get current messages
      const currentMessages = queryClient.getQueryData(['messages', chatId]) as Message[] || [];
      console.log('Current messages count:', currentMessages.length);

      // Create user message
      const userMessageObj: Message = {
        id: generateChatId(),
        content: userMessage,
        sender: 'user',
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date()
      };

      // Add user message to local state immediately
      const updatedMessages = [...currentMessages, userMessageObj];
      queryClient.setQueryData(['messages', chatId], updatedMessages);

      // Save user message to database
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          id: userMessageObj.id,
          conversation_id: chatId,
          content: userMessageObj.content,
          sender: userMessageObj.sender,
          created_at: userMessageObj.created_at
        });

      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
        throw userMsgError;
      }

      console.log('User message saved to database');

      // Get enabled platforms
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
      console.log('Enabled platforms:', enabledPlatforms.map(p => p.name));

      if (enabledPlatforms.length === 0) {
        throw new Error('No AI platforms are enabled');
      }

      // Check token cost
      const tokenCost = await calculateTokenCost(enabledPlatforms);
      console.log('Token cost:', tokenCost);

      if (tokenBalance && tokenCost > 0) {
        const hasEnoughTokens = await checkTokenBalance(tokenCost);
        if (!hasEnoughTokens) {
          throw new Error(`Insufficient tokens. Required: ${tokenCost}, Available: ${tokenBalance.balance}`);
        }
      }

      setIsLoadingResponse(true);
      setCanStop(true);
      abortControllerRef.current = new AbortController();

      // Reset all active statuses
      setActiveAIStatuses({});

      console.log('Starting AI responses...');

      // Call all enabled AI platforms
      const aiPromises = enabledPlatforms.map(async (platform) => {
        updateActiveStatus(platform.id, true);
        
        try {
          console.log(`Calling ${platform.name} API...`);
          const response = await callAIAPI(platform, updatedMessages, enabledPlatforms, chatMode);
          console.log(`${platform.name} responded:`, response.substring(0, 100) + '...');

          if (abortControllerRef.current?.signal.aborted) {
            console.log(`${platform.name} call aborted`);
            return null;
          }

          // Create AI message
          const aiMessage: Message = {
            id: generateChatId(),
            content: response,
            sender: 'ai',
            platform: platform.id,
            created_at: new Date().toISOString(),
            conversation_id: chatId,
            timestamp: new Date()
          };

          // Add AI message to local state
          queryClient.setQueryData(['messages', chatId], (prev: Message[] = []) => {
            return [...prev, aiMessage];
          });

          // Save AI message to database
          const { error: aiMsgError } = await supabase
            .from('messages')
            .insert({
              id: aiMessage.id,
              conversation_id: chatId,
              content: aiMessage.content,
              sender: aiMessage.sender,
              platform: aiMessage.platform,
              created_at: aiMessage.created_at
            });

          if (aiMsgError) {
            console.error(`Error saving ${platform.name} message:`, aiMsgError);
          } else {
            console.log(`${platform.name} message saved to database`);
          }

          return aiMessage;
        } catch (error) {
          console.error(`Error calling ${platform.name}:`, error);
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          if (errMsg.includes('Network error') || errMsg.includes('Load failed')) {
            toast.error(`Network issue with ${platform.name} — retrying may help`);
          } else {
            toast.error(`${platform.name}: ${errMsg}`);
          }
          return null;
        } finally {
          updateActiveStatus(platform.id, false);
        }
      });

      // Wait for all AI responses
      const results = await Promise.allSettled(aiPromises);
      console.log('All AI responses completed');

      return results.filter(result => result.status === 'fulfilled' && result.value !== null);
    },
    onSuccess: () => {
      console.log('=== SEND MESSAGE MUTATION SUCCESS ===');
      setInput('');
      setIsLoadingResponse(false);
      setCanStop(false);
      setActiveAIStatuses({});
    },
    onError: (error: any) => {
      console.error('=== SEND MESSAGE MUTATION ERROR ===', error);
      setIsLoadingResponse(false);
      setCanStop(false);
      setActiveAIStatuses({});
      const msg = error.message || 'Unknown error';
      if (msg.includes('Load failed') || msg.includes('TypeError') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        toast.error('Network error — please check your connection and try again');
      } else if (msg.includes('Session expired') || msg.includes('Not authenticated')) {
        toast.error('Session expired — please refresh the page');
      } else {
        toast.error(msg);
      }
    },
  });

  const handleSend = useCallback(async (chatId: string | null) => {
    if (!input.trim() || !chatId || sendMessageMutation.isPending) return;

    console.log('handleSend called with chatId:', chatId, 'input length:', input.length);
    sendMessageMutation.mutate({ chatId, userMessage: input.trim() });
  }, [input, sendMessageMutation]);

  const handleStop = useCallback(() => {
    console.log('Stopping AI responses...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoadingResponse(false);
    setCanStop(false);
    setActiveAIStatuses({});
    toast.info('AI responses stopped');
  }, []);

  const sendSingleAgentMessage = useCallback(async (chatId: string, message: string, platformId: string) => {
    if (!user) throw new Error('User not authenticated');

    const platform = platforms.find(p => p.id === platformId);
    if (!platform) throw new Error('Platform not found');

    console.log('Sending single agent message to:', platform.name);

    // Get current messages
    const currentMessages = queryClient.getQueryData(['messages', chatId]) as Message[] || [];

    try {
      updateActiveStatus(platform.id, true);
      const response = await callAIAPI(platform, currentMessages, [platform], chatMode);

      // Create AI message
      const aiMessage: Message = {
        id: generateChatId(),
        content: response,
        sender: 'ai',
        platform: platform.id,
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date()
      };

      // Add to local state
      queryClient.setQueryData(['messages', chatId], (prev: Message[] = []) => {
        return [...prev, aiMessage];
      });

      // Save to database
      await supabase
        .from('messages')
        .insert({
          id: aiMessage.id,
          conversation_id: chatId,
          content: aiMessage.content,
          sender: aiMessage.sender,
          platform: aiMessage.platform,
          created_at: aiMessage.created_at
        });

      console.log(`Single agent message from ${platform.name} saved`);
    } catch (error) {
      console.error(`Error sending single agent message to ${platform.name}:`, error);
      toast.error(`Failed to get response from ${platform.name}`);
    } finally {
      updateActiveStatus(platform.id, false);
    }
  }, [user, platforms, callAIAPI, queryClient, updateActiveStatus, chatMode]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    input,
    setInput,
    isLoadingResponse,
    activeAIStatuses,
    sendMessageMutation,
    handleSend,
    handleStop,
    messageQueue,
    getPendingCount,
    canStop,
    sendSingleAgentMessage
  };
};
