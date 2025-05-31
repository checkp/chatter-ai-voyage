import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Chat, Message } from '@/types/chat';
import { generateChatId } from '@/utils/chatUtils';

export const useChats = (user: SupabaseUser | null) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  const getCurrentChat = (): Chat | null => {
    return chats.find(chat => chat.id === activeChat) || null;
  };

  const addMessage = (chatId: string, message: Message) => {
    console.log('Adding message to chat:', chatId, 'from:', message.sender, message.platform || 'user');
    
    setChats(prev => {
      const updatedChats = prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, message],
              lastUpdated: new Date()
            }
          : chat
      );
      
      console.log('Chat state updated. Total messages in active chat:', 
        updatedChats.find(c => c.id === chatId)?.messages.length || 0);
      
      return updatedChats;
    });

    // Save to database asynchronously
    setTimeout(() => {
      const updatedChat = chats.find(chat => chat.id === chatId);
      if (updatedChat) {
        const chatToSave = {
          ...updatedChat,
          messages: [...updatedChat.messages, message],
          lastUpdated: new Date()
        };
        saveConversation(chatToSave);
      }
    }, 0);
  };

  const updateMessageStatus = (chatId: string, messageId: string, status: 'sending' | 'sent' | 'seen', seenBy?: string[]) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: chat.messages.map(msg => 
              msg.id === messageId 
                ? { ...msg, status, seenBy: seenBy || msg.seenBy }
                : msg
            )
          }
        : chat
    ));
  };

  const updateChatTitle = (chatId: string, title: string) => {
    const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: truncatedTitle }
        : chat
    ));
  };

  const createNewChat = async () => {
    const newChat: Chat = {
      id: generateChatId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat.id);
    
    if (user) {
      try {
        await saveConversation(newChat);
        console.log('New chat saved to database with ID:', newChat.id);
      } catch (error) {
        console.error('Failed to save new chat:', error);
        toast.error('Failed to create new chat');
      }
    }

    return newChat.id;
  };

  const deleteChat = async (chatIdToDelete: string) => {
    if (!user) return;

    try {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', chatIdToDelete);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        throw messagesError;
      }

      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', chatIdToDelete)
        .eq('user_id', user.id);

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        throw conversationError;
      }

      setChats(prev => prev.filter(chat => chat.id !== chatIdToDelete));
      
      if (activeChat === chatIdToDelete) {
        const remainingChats = chats.filter(chat => chat.id !== chatIdToDelete);
        if (remainingChats.length > 0) {
          setActiveChat(remainingChats[0].id);
        } else {
          setActiveChat(null);
        }
      }

      toast.success('Chat deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const saveConversation = async (chat: Chat) => {
    if (!user) return;

    try {
      console.log('Saving conversation:', chat.id, 'with', chat.messages.length, 'messages');
      
      const { error: convError } = await supabase
        .from('conversations')
        .upsert({
          id: chat.id,
          user_id: user.id,
          title: chat.title,
          created_at: chat.createdAt.toISOString(),
          updated_at: chat.lastUpdated.toISOString()
        }, {
          onConflict: 'id'
        });

      if (convError) {
        console.error('Error saving conversation:', convError);
        throw convError;
      }

      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', chat.id);

      const existingMessageIds = new Set((existingMessages || []).map(msg => msg.id));
      const newMessages = chat.messages.filter(msg => !existingMessageIds.has(msg.id));

      if (newMessages.length > 0) {
        const messagesToInsert = newMessages.map(msg => ({
          id: msg.id,
          conversation_id: chat.id,
          content: msg.content,
          sender: msg.sender,
          platform: msg.platform,
          created_at: msg.timestamp.toISOString()
        }));

        const { error: msgError } = await supabase
          .from('messages')
          .insert(messagesToInsert);

        if (msgError) {
          console.error('Error saving messages:', msgError);
          throw msgError;
        }
      }
      
      console.log('Conversation saved successfully');
    } catch (error: any) {
      console.error('Failed to save conversation:', error);
      throw error;
    }
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      const conversationsWithMessages = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error loading messages for conversation:', conv.id, messagesError);
            return null;
          }

          return {
            id: conv.id,
            title: conv.title,
            messages: (messages || []).map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender as 'user' | 'ai',
              platform: msg.platform,
              timestamp: new Date(msg.created_at)
            })),
            createdAt: new Date(conv.created_at),
            lastUpdated: new Date(conv.updated_at)
          };
        })
      );

      const validConversations = conversationsWithMessages.filter(conv => conv !== null) as Chat[];
      setChats(validConversations);

      if (validConversations.length > 0 && !activeChat) {
        setActiveChat(validConversations[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  return {
    chats,
    activeChat,
    setActiveChat,
    getCurrentChat,
    addMessage,
    updateMessageStatus,
    updateChatTitle,
    createNewChat,
    deleteChat,
    saveConversation
  };
};
