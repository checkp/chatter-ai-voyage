
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
    const chat = chats.find(chat => chat.id === activeChat) || null;
    console.log('getCurrentChat called - Active chat:', activeChat, 'Found chat:', !!chat, 'Messages count:', chat?.messages?.length || 0);
    return chat;
  };

  const addMessage = (chatId: string, message: Message) => {
    console.log('=== ADD MESSAGE CALLED ===');
    console.log('Chat ID:', chatId);
    console.log('Message details:', {
      id: message.id,
      sender: message.sender,
      platform: message.platform,
      contentLength: message.content.length,
      contentPreview: message.content.substring(0, 100) + '...',
      timestamp: message.timestamp
    });
    
    setChats(prev => {
      console.log('addMessage - Previous chats count:', prev.length);
      const targetChat = prev.find(chat => chat.id === chatId);
      console.log('addMessage - Target chat found:', !!targetChat);
      
      if (!targetChat) {
        console.error('addMessage - Target chat not found!', chatId);
        console.error('addMessage - Available chat IDs:', prev.map(c => c.id));
        return prev;
      }
      
      console.log('addMessage - Target chat current messages:', targetChat.messages?.length || 0);
      
      const updatedChats = prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...(chat.messages || []), message],
              updated_at: new Date().toISOString()
            }
          : chat
      );
      
      const updatedChat = updatedChats.find(c => c.id === chatId);
      console.log('addMessage - Updated chat messages count:', updatedChat?.messages?.length || 0);
      console.log('addMessage - Message added successfully to UI state');
      
      // Save to database immediately
      if (user && updatedChat) {
        console.log('addMessage - Starting database save for message:', message.id);
        saveConversation(updatedChat).then(() => {
          console.log('addMessage - Database save completed for message:', message.id);
        }).catch(error => {
          console.error('addMessage - Database save failed for message:', message.id, error);
        });
      } else {
        console.log('addMessage - Skipping database save - user:', !!user, 'updatedChat:', !!updatedChat);
      }
      
      return updatedChats;
    });
    
    console.log('=== ADD MESSAGE COMPLETED ===');
  };

  const updateMessageStatus = (chatId: string, messageId: string, status: 'sending' | 'sent' | 'seen', seenBy?: string[]) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: (chat.messages || []).map(msg => 
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user?.id || ''
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
    if (!user) {
      console.log('saveConversation - No user, skipping save');
      return;
    }

    try {
      console.log('saveConversation - Starting save for chat:', chat.id, 'with', chat.messages?.length || 0, 'messages');
      
      const { error: convError } = await supabase
        .from('conversations')
        .upsert({
          id: chat.id,
          user_id: user.id,
          title: chat.title,
          created_at: chat.created_at,
          updated_at: chat.updated_at
        }, {
          onConflict: 'id'
        });

      if (convError) {
        console.error('saveConversation - Error saving conversation:', convError);
        throw convError;
      }
      console.log('saveConversation - Conversation saved successfully');

      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', chat.id);

      const existingMessageIds = new Set((existingMessages || []).map(msg => msg.id));
      const newMessages = (chat.messages || []).filter(msg => !existingMessageIds.has(msg.id));

      console.log('saveConversation - Existing messages:', existingMessageIds.size, 'New messages:', newMessages.length);

      if (newMessages.length > 0) {
        const messagesToInsert = newMessages.map(msg => ({
          id: msg.id,
          conversation_id: chat.id,
          content: msg.content,
          sender: msg.sender,
          platform: msg.platform,
          created_at: msg.created_at
        }));

        console.log('saveConversation - Inserting messages:', messagesToInsert.map(m => ({ id: m.id, sender: m.sender, platform: m.platform })));

        const { error: msgError } = await supabase
          .from('messages')
          .insert(messagesToInsert);

        if (msgError) {
          console.error('saveConversation - Error saving messages:', msgError);
          throw msgError;
        }
        console.log('saveConversation - Messages saved successfully');
      }
      
      console.log('saveConversation - All data saved successfully');
    } catch (error: any) {
      console.error('saveConversation - Failed to save conversation:', error);
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
            ...conv,
            messages: (messages || []).map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender as 'user' | 'ai',
              platform: msg.platform,
              created_at: msg.created_at,
              conversation_id: msg.conversation_id,
              timestamp: new Date(msg.created_at)
            }))
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
    saveConversation
  };
};
