import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from '@/components/ModeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { Send, Settings, User, Plus, RefreshCw } from 'lucide-react';
import { usePlatforms } from '@/hooks/usePlatforms';
import type { Message, Chat, AIPlatform } from '@/types/chat';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { getModelConfig } from '@/config/aiModels';
import SettingsPanel from '@/components/SettingsPanel';

const Index = () => {
  const user = useUser();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { 
    platforms, 
    setPlatforms, 
    togglePlatform, 
    callAIAPI, 
    loadApiKeysStatus 
  } = usePlatforms(user);
  
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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

  useEffect(() => {
    if (chats && chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id);
      setIsInitialLoadComplete(true);
    }
  }, [chats, activeChatId]);

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
        timestamp: new Date(msg.created_at),
        status: 'sent' as const,
        seenBy: []
      }));
    },
    enabled: !!activeChatId,
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, theme]);

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
    },
    onError: (error: any) => {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation: ' + error.message);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content, platformId }: { chatId: string, content: string, platformId?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const newMessageId = uuidv4();
      const timestamp = new Date().toISOString();

      // Save user message to database
      const { error: userMessageError } = await supabase
        .from('messages')
        .insert([{
          id: newMessageId,
          conversation_id: chatId,
          content,
          sender: 'user',
          created_at: timestamp,
          platform: platformId,
        }]);

      if (userMessageError) {
        console.error('Error sending message:', userMessageError);
        throw userMessageError;
      }

      return { chatId, content, newMessageId, timestamp };
    },
    onSuccess: async ({ chatId, content, newMessageId, timestamp }) => {
      // Invalidate and refetch messages to reflect changes
      await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      
      // Call all enabled AI APIs in parallel
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
      if (enabledPlatforms.length === 0) {
        toast.error('No AI agents enabled. Please enable at least one agent in settings.');
        return;
      }

      setIsLoadingResponse(true);

      try {
        const aiResponses = await Promise.all(
          enabledPlatforms.map(async (platform) => {
            try {
              const aiContent = await callAIAPI(platform, messages || [], platforms);
              return { platformId: platform.id, content: aiContent };
            } catch (apiError: any) {
              console.error(`Error calling ${platform.name} API:`, apiError);
              toast.error(`Error calling ${platform.name} API: ${apiError.message}`);
              return { platformId: platform.id, content: `Error: ${apiError.message}` };
            }
          })
        );

        // Save AI responses to database
        const aiMessageInserts = aiResponses.map(({ platformId, content }) => ({
          id: uuidv4(),
          conversation_id: chatId,
          content,
          sender: 'ai',
          created_at: new Date().toISOString(),
          platform: platformId,
        }));

        const { error: aiMessageError } = await supabase
          .from('messages')
          .insert(aiMessageInserts);

        if (aiMessageError) {
          console.error('Error saving AI messages:', aiMessageError);
          toast.error('Error saving AI messages: ' + aiMessageError.message);
        } else {
          // Update the UI with the new messages
          await queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
          toast.success('AI responses received');
        }
      } finally {
        setIsLoadingResponse(false);
      }
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + error.message);
    },
  });

  const handleSend = async () => {
    if (!input.trim() || !activeChatId) return;
    
    const content = input.trim();
    setInput('');

    try {
      await sendMessageMutation.mutateAsync({ chatId: activeChatId, content });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + error.message);
    }
  };

  const handlePlatformToggle = async (platformId: string) => {
    try {
      await togglePlatform(platformId);
    } catch (error: any) {
      console.error('Failed to toggle platform:', error);
      toast.error('Failed to toggle platform: ' + error.message);
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

  const getPlatformName = (platformId: string) => {
    return platforms.find(p => p.id === platformId)?.name || platformId;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Please sign in to continue.</h1>
        <Button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}>
          Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Chat List Sidebar */}
      <aside className="w-64 border-r bg-secondary border-border flex flex-col">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chats</h2>
          <ModeToggle />
        </div>

        <Button variant="ghost" className="justify-start rounded-none hover:bg-accent hover:text-accent-foreground" onClick={() => setIsNewChatDrawerOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>

        <ScrollArea className="flex-1">
          <div className="py-2">
            {isLoadingChats && (
              <div className="px-4 py-2">
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {!isLoadingChats && chats?.map((chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                className={`w-full justify-start rounded-none hover:bg-accent hover:text-accent-foreground ${activeChatId === chat.id ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => setActiveChatId(chat.id)}
              >
                {chat.title}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="border-b bg-secondary border-border p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{chats?.find(chat => chat.id === activeChatId)?.title || 'Select a chat'}</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setActiveTab(activeTab === 'chat' ? 'settings' : 'chat')}>
              {activeTab === 'chat' ? <Settings className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Avatar>
              <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Chat Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'chat' && (
            <>
              {isLoadingMessages && (
                <div className="flex flex-col gap-2">
                  <Skeleton className="w-80 h-9" />
                  <Skeleton className="w-64 h-9" />
                  <Skeleton className="w-96 h-9" />
                </div>
              )}
              {!isLoadingMessages && messages?.map((message) => (
                <div key={message.id} className={`mb-2 flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-3xl rounded-lg p-3 text-sm break-words ${message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                    }`}>
                    {message.content}
                    {message.sender === 'ai' && message.platform && (
                      <div className="mt-1 text-xs text-gray-500">
                        - {platforms.find(p => p.id === message.platform)?.name || message.platform}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}

          {activeTab === 'settings' && (
            <SettingsPanel />
          )}
        </div>

        {/* Chat Input */}
        {activeTab === 'chat' && (
          <footer className="border-t bg-secondary border-border p-4">
            <div className="flex items-center gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // handleSend();
                  }
                }}
                placeholder="Type your message here..."
                className="flex-1 resize-none"
              />
              <Button disabled={isLoadingResponse}>
                {isLoadingResponse ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send
              </Button>
            </div>
          </footer>
        )}
      </main>

      {/* New Chat Drawer */}
      <Drawer open={isNewChatDrawerOpen} onOpenChange={setIsNewChatDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New Chat</DrawerTitle>
            <DrawerDescription>
              Enter a title for the new chat.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <Input
              type="text"
              placeholder="Chat title"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
            />
          </div>
          <DrawerFooter>
            <Button onClick={() => createChatMutation.mutate(newChatTitle || 'New Chat')}>Create Chat</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Index;
