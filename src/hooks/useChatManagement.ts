
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Chat, Message } from '@/types/chat';

export const useChatManagement = (user: any) => {
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const { data: chats, isLoading: isLoadingChats } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      return (data || []).map(conv => ({
        ...conv,
        messages: [] as Message[],
        createdAt: new Date(conv.created_at),
        lastUpdated: new Date(conv.updated_at)
      }));
    },
    enabled: !!user?.id,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', activeChatId],
    queryFn: async () => {
      if (!activeChatId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeChatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      return (data || []).map(msg => ({
        ...msg,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at),
        status: 'sent' as const,
        seenBy: []
      }));
    },
    enabled: !!activeChatId,
  });

  const createChatMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const newChatId = uuidv4();
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ 
          id: newChatId,
          user_id: user.id, 
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }

      return {
        ...data,
        messages: [] as Message[],
        createdAt: new Date(data.created_at),
        lastUpdated: new Date(data.updated_at)
      } as Chat;
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setActiveChatId(newChat.id);
      console.log('New chat created successfully:', newChat.id);
    },
    onError: (error: any) => {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation: ' + error.message);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // First delete all messages for this conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', chatId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        throw messagesError;
      }

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        throw conversationError;
      }

      return chatId;
    },
    onSuccess: (deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      
      // If the deleted chat was active, switch to another chat or clear selection
      if (activeChatId === deletedChatId) {
        const remainingChats = chats?.filter(chat => chat.id !== deletedChatId);
        if (remainingChats && remainingChats.length > 0) {
          setActiveChatId(remainingChats[0].id);
        } else {
          setActiveChatId(null);
        }
      }
      
      toast.success('Chat deleted successfully');
      console.log('Chat deleted successfully:', deletedChatId);
    },
    onError: (error: any) => {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat: ' + error.message);
    },
  });

  useEffect(() => {
    // Auto-create first chat if user has no conversations
    if (chats && chats.length === 0 && !activeChatId && !isLoadingChats && user) {
      console.log('No chats found, creating first chat automatically');
      createChatMutation.mutate('Welcome Chat');
    } else if (chats && chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id);
      setIsInitialLoadComplete(true);
    }
  }, [chats, activeChatId, isLoadingChats, user]);

  return {
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    setActiveChatId,
    createChatMutation,
    deleteChatMutation,
    isInitialLoadComplete
  };
};
