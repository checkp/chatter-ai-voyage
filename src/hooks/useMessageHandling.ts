
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message, ChatMode } from '@/types/chat';
import { generateChatId } from '@/utils/chatUtils';
import { useTokens } from '@/hooks/useTokens';
import { useActivityLog } from '@/contexts/ActivityLogContext';
import { isImageGenerationIntent, IMAGE_ROUTING_REPLY } from '@/utils/intentDetection';

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
  const { addEntry } = useActivityLog();

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
      addEntry('user', `Message sent: "${userMessage.substring(0, 60)}${userMessage.length > 60 ? '...' : ''}"`);

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

      // Fire-and-forget: embed the user message for shared context (RAG)
      supabase.functions.invoke('embed-messages', {
        body: { mode: 'single', items: [{ message_id: userMessageObj.id, conversation_id: chatId, content: userMessageObj.content }] },
      }).catch(e => console.warn('embed user message failed:', e));

      // Note: chat auto-rename is handled AFTER AI responses complete (see below),
      // using an AI-generated laconic title rather than the raw first message.


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
        addEntry('ai', `Requesting response...`, platform.name);
        
        try {
          console.log(`Calling ${platform.name} API...`);
          const response = await callAIAPI(platform, updatedMessages, enabledPlatforms, chatMode);
          addEntry('ai', `Response received (${response.length} chars)`, platform.name);
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
          addEntry('error', errMsg, platform.name);
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

      // Auto-rename chat with an AI-generated laconic title.
      // Trigger only when the title is still "New Chat" AND we have enough
      // context (>= 2 user messages, OR 1 user + at least 1 AI reply).
      try {
        const chats = queryClient.getQueryData(['chats', user.id]) as any[] | undefined;
        const currentChat = chats?.find(c => c.id === chatId);
        if (currentChat && currentChat.title === 'New Chat') {
          const allMsgs = (queryClient.getQueryData(['messages', chatId]) as Message[]) || [];
          const userCount = allMsgs.filter(m => m.sender === 'user').length;
          const aiCount = allMsgs.filter(m => m.sender === 'ai').length;
          const hasEnoughContext = userCount >= 2 || (userCount >= 1 && aiCount >= 1);

          if (hasEnoughContext) {
            const payload = allMsgs.slice(-8).map(m => ({
              sender: m.sender,
              content: m.content,
              platform: m.platform,
            }));
            const { data: titleData, error: titleFnErr } = await supabase.functions.invoke(
              'generate-chat-title',
              { body: { messages: payload } }
            );
            const newTitle: string | undefined = titleData?.title;
            if (!titleFnErr && newTitle && newTitle.length > 0) {
              const { error: updErr } = await supabase
                .from('conversations')
                .update({ title: newTitle })
                .eq('id', chatId)
                .eq('user_id', user.id)
                .eq('title', 'New Chat');
              if (!updErr) {
                queryClient.setQueryData(['chats', user.id], (old: any[] = []) =>
                  old.map(c => (c.id === chatId ? { ...c, title: newTitle } : c))
                );
              }
            }
          }
        }
      } catch (e) {
        console.warn('AI chat-title generation failed:', e);
      }

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
      addEntry('error', `Send failed: ${msg}`);
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

    const trimmed = input.trim();

    // Note: image-generation intent is now handled in ChatInput by opening
    // the multi-model picker (which fans out to all selected image models).


    console.log('handleSend called with chatId:', chatId, 'input length:', input.length);
    sendMessageMutation.mutate({ chatId, userMessage: input.trim() });
  }, [input, sendMessageMutation, queryClient, addEntry]);

  const handleStop = useCallback(() => {
    console.log('Stopping AI responses...');
    addEntry('system', 'AI responses stopped by user');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoadingResponse(false);
    setCanStop(false);
    setActiveAIStatuses({});
    toast.info('AI responses stopped');
  }, [addEntry]);

  const sendSingleAgentMessage = useCallback(async (chatId: string, message: string, platformId: string) => {
    if (!user) throw new Error('User not authenticated');

    const platform = platforms.find(p => p.id === platformId);
    if (!platform) throw new Error('Platform not found');

    console.log('Sending single agent message to:', platform.name, '| message length:', message.length);

    // 1. Append the user's private message (if any) to local cache + DB FIRST,
    //    otherwise the agent never sees what the user just typed.
    let messagesForAI = (queryClient.getQueryData(['messages', chatId]) as Message[]) || [];

    if (message && message.trim().length > 0) {
      const userMessage: Message = {
        id: generateChatId(),
        content: message,
        sender: 'user',
        platform: null as any,
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date(),
      };

      messagesForAI = [...messagesForAI, userMessage];

      queryClient.setQueryData(['messages', chatId], (prev: Message[] = []) => [...prev, userMessage]);

      const { error: userInsertError } = await supabase.from('messages').insert({
        id: userMessage.id,
        conversation_id: chatId,
        content: userMessage.content,
        sender: userMessage.sender,
        platform: null,
        created_at: userMessage.created_at,
      });
      if (userInsertError) {
        console.error('Failed to persist private user message:', userInsertError);
      }
    }

    try {
      updateActiveStatus(platform.id, true);
      // Force isolated context so the agent sees its own past replies + the new prompt,
      // and is not polluted by other agents' responses in this private thread.
      const response = await callAIAPI(platform, messagesForAI, [platform], 'isolated');

      const aiMessage: Message = {
        id: generateChatId(),
        content: response,
        sender: 'ai',
        platform: platform.id,
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date(),
      };

      queryClient.setQueryData(['messages', chatId], (prev: Message[] = []) => [...prev, aiMessage]);

      const { error: aiInsertError } = await supabase.from('messages').insert({
        id: aiMessage.id,
        conversation_id: chatId,
        content: aiMessage.content,
        sender: aiMessage.sender,
        platform: aiMessage.platform,
        created_at: aiMessage.created_at,
      });
      if (aiInsertError) {
        console.error('Failed to persist single-agent AI reply:', aiInsertError);
      }

      console.log(`Single agent message from ${platform.name} saved`);
    } catch (error) {
      console.error(`Error sending single agent message to ${platform.name}:`, error);
      toast.error(`Failed to get response from ${platform.name}`);
    } finally {
      updateActiveStatus(platform.id, false);
    }
  }, [user, platforms, callAIAPI, queryClient, updateActiveStatus]);

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
