
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Chat, Message } from '@/types/chat';
import { generateChatId } from '@/utils/chatUtils';

export const useChatManagement = (user: SupabaseUser | null) => {
  const queryClient = useQueryClient();

  // Fetch conversations
  const {
    data: chats = [],
    isLoading: isLoadingChats,
    isSuccess: isInitialLoadComplete
  } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('Fetching conversations for user:', user.id);
      
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        throw error;
      }

      console.log('Loaded conversations:', conversations?.length || 0);
      return conversations || [];
    },
    enabled: !!user?.id,
  });

  // Fetch messages for active chat
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages 
  } = useQuery({
    queryKey: ['messages', chats?.[0]?.id],
    queryFn: async () => {
      const activeChatId = chats?.[0]?.id;
      if (!activeChatId) {
        console.log('No active chat ID for message fetching');
        return [];
      }

      console.log('Fetching messages for chat:', activeChatId);
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeChatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages for chat:', activeChatId, error);
        throw error;
      }

      const formattedMessages = (messages || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'ai',
        platform: msg.platform,
        created_at: msg.created_at,
        conversation_id: msg.conversation_id,
        timestamp: new Date(msg.created_at)
      }));

      console.log('Loaded messages for chat', activeChatId, ':', formattedMessages.length);
      return formattedMessages;
    },
    enabled: !!chats?.[0]?.id,
  });

  const activeChatId = chats?.[0]?.id || null;

  const setActiveChatId = (chatId: string | null) => {
    if (!chatId) return;
    
    // Find the chat and move it to the front of the array
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    if (chatIndex > 0) {
      const updatedChats = [...chats];
      const [selectedChat] = updatedChats.splice(chatIndex, 1);
      updatedChats.unshift(selectedChat);
      
      // Update the conversations query cache
      queryClient.setQueryData(['conversations', user?.id], updatedChats);
    }
    
    // Invalidate messages for the new active chat
    queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
  };

  const createChatMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const newChat: Chat = {
        id: generateChatId(),
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.id
      };

      console.log('Creating new chat:', newChat.id);

      const { error } = await supabase
        .from('conversations')
        .insert([{
          id: newChat.id,
          user_id: newChat.user_id,
          title: newChat.title,
          created_at: newChat.created_at,
          updated_at: newChat.updated_at
        }]);

      if (error) {
        console.error('Error creating chat:', error);
        throw error;
      }

      return newChat;
    },
    onSuccess: (newChat) => {
      console.log('Chat created successfully:', newChat.id);
      
      // Add the new chat to the beginning of the list
      const currentChats = queryClient.getQueryData(['conversations', user?.id]) as Chat[] || [];
      const updatedChats = [newChat, ...currentChats];
      queryClient.setQueryData(['conversations', user?.id], updatedChats);
      
      // Initialize empty messages for the new chat
      queryClient.setQueryData(['messages', newChat.id], []);
      
      toast.success('New chat created');
    },
    onError: (error: any) => {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat: ' + (error.message || 'Unknown error'));
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Deleting chat:', chatId);

      // Delete messages first
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
      console.log('Chat deleted successfully:', deletedChatId);
      
      // Remove the chat from the list
      const currentChats = queryClient.getQueryData(['conversations', user?.id]) as Chat[] || [];
      const updatedChats = currentChats.filter(chat => chat.id !== deletedChatId);
      queryClient.setQueryData(['conversations', user?.id], updatedChats);
      
      // Clear messages cache for the deleted chat
      queryClient.removeQueries({ queryKey: ['messages', deletedChatId] });
      
      toast.success('Chat deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat: ' + (error.message || 'Unknown error'));
    },
  });

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
