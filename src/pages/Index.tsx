
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from '@/components/ModeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { Send, Settings, Plus, RefreshCw } from 'lucide-react';
import { usePlatforms } from '@/hooks/usePlatforms';
import type { Message, Chat } from '@/types/chat';
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import SettingsPanel from '@/components/SettingsPanel';
import { useAuth } from '@/hooks/useAuth';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import NewChatDrawer from '@/components/NewChatDrawer';

const Index = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [processingSentMessageId, setProcessingSentMessageId] = useState<string | null>(null);
  const [activeAIStatuses, setActiveAIStatuses] = useState<Record<string, 'thinking' | 'responding' | 'completed' | 'error'>>({});
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');

  const { platforms, togglePlatform, callAIAPI } = usePlatforms(user);
  const { messagesEndRef, scrollToBottom } = useScrollToBottom([]);

  // Always call hooks - move all useQuery hooks to the top
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
      setNewChatTitle('');
      setIsNewChatDrawerOpen(false);
      console.log('New chat created successfully:', newChat.id);
    },
    onError: (error: any) => {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation: ' + error.message);
    },
  });

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

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Please sign in to continue.</h1>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Sign In
        </Button>
      </div>
    );
  }

  const handleSend = async () => {
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

  const handleNewChat = async () => {
    try {
      await createChatMutation.mutate(newChatTitle || 'New Chat');
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex h-screen overflow-hidden">
      <ChatSidebar 
        chats={chats}
        isLoadingChats={isLoadingChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        setIsNewChatDrawerOpen={setIsNewChatDrawerOpen}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatHeader 
          chats={chats}
          activeChatId={activeChatId}
          activeAIStatuses={activeAIStatuses}
          platforms={platforms}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
        />

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ScrollArea className="h-full">
              <div className="p-4">
                <ChatMessages 
                  messages={messages}
                  isLoadingMessages={isLoadingMessages}
                  isLoadingResponse={isLoadingResponse}
                  platforms={platforms}
                />
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          {activeTab === 'settings' && (
            <div className="h-full overflow-y-auto p-4">
              <SettingsPanel />
            </div>
          )}
        </div>

        {/* Chat Input */}
        {activeTab === 'chat' && (
          <ChatInput 
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            isLoadingResponse={isLoadingResponse}
            isPending={sendMessageMutation.isPending}
          />
        )}
      </main>

      <NewChatDrawer 
        isOpen={isNewChatDrawerOpen}
        setIsOpen={setIsNewChatDrawerOpen}
        newChatTitle={newChatTitle}
        setNewChatTitle={setNewChatTitle}
        onCreateChat={handleNewChat}
        isLoading={createChatMutation.isPending}
      />
    </div>
  );
};

export default Index;
