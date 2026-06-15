
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Chat, Message, ChatMode } from '@/types/chat';

export const useChatManagement = (user: any) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatMode, setActiveChatMode] = useState<ChatMode>('discussion');
  const [isolatedMode, setIsolatedMode] = useState<boolean>(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const queryClient = useQueryClient();

  const fetchChats = async (): Promise<Chat[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          user_id,
          chat_mode,
          isolated_mode,
          messages:messages(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        throw error;
      }

      // Transform the data to match our Chat interface with proper type casting
      const transformedChats: Chat[] = (data || []).map(chat => ({
        id: chat.id,
        title: chat.title,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        user_id: chat.user_id,
        chat_mode: chat.chat_mode as ChatMode,
        isolated_mode: chat.isolated_mode || false,
        messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0
      }));

      return transformedChats;
    } catch (error: any) {
      console.error('Failed to fetch chats:', error);
      throw error;
    }
  };

  const {
    data: chats,
    isLoading: isLoadingChats,
    error: chatsError,
  } = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: fetchChats,
  });

  // Use useEffect to handle the initial load completion
  useEffect(() => {
    if (chats) {
      setIsInitialLoadComplete(true);
    }
  }, [chats]);

  const fetchMessages = async (chatId: string | null): Promise<Message[]> => {
    if (!chatId) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      // Transform the data to match our Message interface with proper type casting
      return (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'ai', // Type cast the string to the union type
        platform: msg.platform,
        created_at: msg.created_at,
        conversation_id: msg.conversation_id,
        timestamp: new Date(msg.created_at),
        attachments: Array.isArray((msg as any).attachments) ? (msg as any).attachments : [],
      }));
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  };

  const {
    data: messages,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['messages', activeChatId],
    queryFn: () => fetchMessages(activeChatId),
    enabled: !!activeChatId,
  });

  const createChatMutation = useMutation({
    mutationFn: async ({ title, chatMode = 'discussion', isolatedMode = false }: { title: string; chatMode?: ChatMode; isolatedMode?: boolean }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          title,
          user_id: user.id,
          chat_mode: chatMode,
          isolated_mode: isolatedMode
        }])
        .select('id, title, created_at, updated_at, user_id, chat_mode, isolated_mode')
        .single();

      if (error) throw error;

      return {
        ...data,
        chat_mode: data.chat_mode as ChatMode,
        isolated_mode: data.isolated_mode || false,
        messageCount: 0
      } as Chat;
    },
    onSuccess: (newChat) => {
      queryClient.setQueryData(['chats', user?.id], (oldChats: Chat[] = []) => [newChat, ...oldChats]);
      setActiveChatId(newChat.id);
      setActiveChatMode(newChat.chat_mode || 'discussion');
      setIsolatedMode(newChat.isolated_mode || false);
    },
    onError: (error: any) => {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat');
    }
  });

  const updateChatModeMutation = useMutation({
    mutationFn: async ({ chatId, chatMode }: { chatId: string; chatMode: ChatMode }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .update({ chat_mode: chatMode })
        .eq('id', chatId)
        .eq('user_id', user.id)
        .select('id, chat_mode')
        .single();

      if (error) throw error;
      return { ...data, chat_mode: data.chat_mode as ChatMode };
    },
    onSuccess: (updatedChat) => {
      setActiveChatMode(updatedChat.chat_mode);
      
      queryClient.setQueryData(['chats', user?.id], (oldChats: Chat[] = []) =>
        oldChats.map(chat =>
          chat.id === updatedChat.id
            ? { ...chat, chat_mode: updatedChat.chat_mode }
            : chat
        )
      );
      
      toast.success(`Chat view changed to ${updatedChat.chat_mode}`);
    },
    onError: (error: any) => {
      console.error('Failed to update chat mode:', error);
      toast.error('Failed to update chat view');
    }
  });

  const updateIsolatedModeMutation = useMutation({
    mutationFn: async ({ chatId, isolatedMode }: { chatId: string; isolatedMode: boolean }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .update({ isolated_mode: isolatedMode })
        .eq('id', chatId)
        .eq('user_id', user.id)
        .select('id, isolated_mode')
        .single();

      if (error) throw error;
      return { ...data, isolated_mode: data.isolated_mode || false };
    },
    onSuccess: (updatedChat) => {
      setIsolatedMode(updatedChat.isolated_mode);
      
      queryClient.setQueryData(['chats', user?.id], (oldChats: Chat[] = []) =>
        oldChats.map(chat =>
          chat.id === updatedChat.id
            ? { ...chat, isolated_mode: updatedChat.isolated_mode }
            : chat
        )
      );
      
      toast.success(`Isolated mode ${updatedChat.isolated_mode ? 'enabled' : 'disabled'}`);
    },
    onError: (error: any) => {
      console.error('Failed to update isolated mode:', error);
      toast.error('Failed to update isolated mode');
    }
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting chat:', error);
        throw error;
      }
      return chatId;
    },
    onSuccess: (chatId) => {
      // Remove the chat from the query cache
      queryClient.setQueryData(['chats', user?.id], (oldChats: Chat[] = []) =>
        oldChats.filter(chat => chat.id !== chatId)
      );
      
      // Clear messages and active chat if deleted chat was active
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
      toast.success('Chat deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  });

  useEffect(() => {
    if (chats && chats.length > 0 && !activeChatId) {
      // Skip conductor conversations when auto-selecting
      const nonConductorChat = chats.find(c => !c.title.startsWith('Conductor: '));
      if (nonConductorChat) {
        setActiveChatId(nonConductorChat.id);
      }
    }
  }, [chats, activeChatId]);

  // Handle active chat change
  useEffect(() => {
    if (activeChatId && chats) {
      const activeChat = chats.find(chat => chat.id === activeChatId);
      if (activeChat) {
        setActiveChatMode(activeChat.chat_mode || 'discussion');
        setIsolatedMode(activeChat.isolated_mode || false);
      }
    }
  }, [activeChatId, chats]);

  return {
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    activeChatMode,
    isolatedMode,
    setActiveChatId,
    setActiveChatMode,
    setIsolatedMode,
    createChatMutation,
    updateChatModeMutation,
    updateIsolatedModeMutation,
    deleteChatMutation,
    isInitialLoadComplete
  };
};
