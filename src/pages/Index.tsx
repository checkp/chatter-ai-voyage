import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MessageSquare, Settings, History, Key, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ApiKeySettings from '@/components/ApiKeySettings';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import BotHistoryDialog from '@/components/BotHistoryDialog';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  platform?: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastUpdated: Date;
}

interface AIPlatform {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  icon: string;
  hasApiKey?: boolean;
  endpoint?: string;
}

const Index = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [platforms, setPlatforms] = useState<AIPlatform[]>([
    { 
      id: 'openai', 
      name: 'ChatGPT', 
      enabled: false, 
      color: 'bg-agent-openai border-agent-openai text-cyber-bg', 
      icon: '🤖',
      hasApiKey: false
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      enabled: false,
      color: 'bg-agent-anthropic border-agent-anthropic text-cyber-bg', 
      icon: '🎭',
      hasApiKey: false
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      enabled: false, 
      color: 'bg-agent-deepseek border-agent-deepseek text-cyber-bg', 
      icon: '🔍',
      hasApiKey: false
    },
  ]);

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showBotHistoryDialog, setShowBotHistoryDialog] = useState(false);
  const [selectedPlatformForHistory, setSelectedPlatformForHistory] = useState<AIPlatform | null>(null);

  // Utility functions
  const getCurrentChat = (): Chat | null => {
    return chats.find(chat => chat.id === activeChat) || null;
  };

  const addMessage = (chatId: string, message: Message) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, message],
            lastUpdated: new Date()
          }
        : chat
    ));
    
    // Auto-scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Save to database
    const updatedChat = chats.find(chat => chat.id === chatId);
    if (updatedChat) {
      const chatToSave = {
        ...updatedChat,
        messages: [...updatedChat.messages, message],
        lastUpdated: new Date()
      };
      saveConversation(chatToSave);
    }
  };

  const updateChatTitle = (chatId: string, title: string) => {
    const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: truncatedTitle }
        : chat
    ));
  };

  const buildConversationHistory = (chatId: string): Array<{role: 'user' | 'assistant', content: string}> => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return [];

    return chat.messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));
  };

  const buildConversationHistoryForAgent = (chatId: string, agentPlatform: string): Array<{role: 'user' | 'assistant', content: string}> => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return [];

    const history: Array<{role: 'user' | 'assistant', content: string}> = [];
    
    chat.messages.forEach(msg => {
      if (msg.sender === 'user') {
        history.push({
          role: 'user' as const,
          content: msg.content
        });
      } else if (msg.sender === 'ai') {
        // Include all AI responses with platform context
        if (msg.platform === agentPlatform) {
          // This agent's own response
          history.push({
            role: 'assistant' as const,
            content: msg.content
          });
        } else if (msg.platform && msg.platform !== agentPlatform) {
          // Other agent's response - include with platform identifier
          const platform = platforms.find(p => p.id === msg.platform);
          const platformName = platform ? platform.name : msg.platform;
          history.push({
            role: 'assistant' as const,
            content: `[Response from ${platformName}]: ${msg.content}`
          });
        }
      }
    });

    return history;
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat.id);
  };

  const loadApiKeysStatus = async () => {
    if (!user) return;

    try {
      const { data: apiKeys, error } = await supabase
        .from('user_api_keys')
        .select('platform')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading API keys:', error);
        return;
      }

      const platformsWithKeys = new Set((apiKeys || []).map(key => key.platform));
      
      setPlatforms(prev => prev.map(platform => ({
        ...platform,
        hasApiKey: platformsWithKeys.has(platform.id)
      })));
    } catch (error: any) {
      console.error('Failed to load API keys status:', error);
    }
  };

  // Load conversations from database
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

  // Load agent settings from database
  const loadAgentSettings = async () => {
    if (!user) return;

    try {
      const { data: settings, error } = await supabase
        .from('user_agent_settings')
        .select('platform, enabled')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading agent settings:', error);
        return;
      }

      const settingsMap = new Map((settings || []).map(setting => [setting.platform, setting.enabled]));
      
      setPlatforms(prev => prev.map(platform => ({
        ...platform,
        enabled: settingsMap.get(platform.id) || false
      })));
    } catch (error: any) {
      console.error('Failed to load agent settings:', error);
    }
  };

  // Save agent setting to database
  const saveAgentSetting = async (platformId: string, enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_agent_settings')
        .upsert({
          user_id: user.id,
          platform: platformId,
          enabled: enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error('Error saving agent setting:', error);
        toast.error('Failed to save agent setting');
      }
    } catch (error: any) {
      console.error('Failed to save agent setting:', error);
      toast.error('Failed to save agent setting');
    }
  };

  // Save conversation to database
  const saveConversation = async (chat: Chat) => {
    if (!user) return;

    try {
      // First save/update the conversation
      const { error: convError } = await supabase
        .from('conversations')
        .upsert({
          id: chat.id,
          user_id: user.id,
          title: chat.title,
          updated_at: new Date().toISOString()
        });

      if (convError) {
        console.error('Error saving conversation:', convError);
        return;
      }

      // Then save any new messages
      const existingMessageIds = new Set();
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', chat.id);

      if (existingMessages) {
        existingMessages.forEach(msg => existingMessageIds.add(msg.id));
      }

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
        }
      }
    } catch (error: any) {
      console.error('Failed to save conversation:', error);
    }
  };

  const callOpenAI = async (conversationHistory: Array<{role: 'user' | 'assistant', content: string}>): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    console.log('Calling OpenAI API...');
    
    const { data: apiKeyData, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('platform', 'openai')
      .single();

    if (error) {
      console.error('OpenAI API key error:', error);
      throw new Error('OpenAI API key not found. Please add your API key in settings.');
    }

    if (!apiKeyData?.encrypted_key) {
      throw new Error('OpenAI API key is empty. Please add your API key in settings.');
    }

    console.log('Making OpenAI request with key:', apiKeyData.encrypted_key.substring(0, 10) + '...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyData.encrypted_key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: conversationHistory,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API response error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callDeepSeek = async (conversationHistory: Array<{role: 'user' | 'assistant', content: string}>): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    console.log('Calling DeepSeek API...');
    
    const { data: apiKeyData, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('platform', 'deepseek')
      .single();

    if (error) {
      console.error('DeepSeek API key error:', error);
      throw new Error('DeepSeek API key not found. Please add your API key in settings.');
    }

    if (!apiKeyData?.encrypted_key) {
      throw new Error('DeepSeek API key is empty. Please add your API key in settings.');
    }

    console.log('Making DeepSeek request with key:', apiKeyData.encrypted_key.substring(0, 10) + '...');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyData.encrypted_key}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: conversationHistory,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API response error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callClaudeAPI = async (conversationHistory: Array<{role: 'user' | 'assistant', content: string}>): Promise<string> => {
    console.log('Calling Claude API via edge function...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    console.log('Invoking claude-chat function...');

    const response = await supabase.functions.invoke('claude-chat', {
      body: { messages: conversationHistory },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    console.log('Claude function response:', response);

    if (response.error) {
      console.error('Claude function error:', response.error);
      throw new Error(response.error.message || 'Claude API call failed');
    }

    if (!response.data?.content) {
      console.error('Claude function missing content:', response.data);
      throw new Error('Claude API returned empty response');
    }

    return response.data.content;
  };

  const callAIAPI = async (platform: AIPlatform, conversationHistory: Array<{role: 'user' | 'assistant', content: string}>): Promise<string> => {
    switch (platform.id) {
      case 'anthropic':
        return await callClaudeAPI(conversationHistory);
      case 'openai':
        return await callOpenAI(conversationHistory);
      case 'deepseek':
        return await callDeepSeek(conversationHistory);
      default:
        throw new Error(`Unsupported platform: ${platform.id}`);
    }
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage called');
    console.log('inputMessage:', inputMessage);
    console.log('activeChat:', activeChat);
    
    if (!inputMessage.trim()) {
      console.log('No input message');
      return;
    }
    
    let chatId = activeChat;
    
    // If no active chat, create one first
    if (!chatId) {
      console.log('No active chat, creating new one');
      const newChat: Chat = {
        id: `chat-${Date.now()}`,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat.id);
      chatId = newChat.id;
    }

    const currentChat = chats.find(chat => chat.id === chatId);
    if (!currentChat && !chatId.startsWith('chat-')) {
      console.log('Current chat not found');
      return;
    }

    const enabledPlatforms = platforms.filter(p => {
      console.log(`Platform ${p.name}: enabled=${p.enabled}, hasApiKey=${p.hasApiKey}`);
      return p.enabled && p.hasApiKey;
    });
    
    console.log('Enabled platforms:', enabledPlatforms);
    
    if (enabledPlatforms.length === 0) {
      toast.error('Please enable at least one AI platform with a valid API key');
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    addMessage(chatId, userMessage);

    // Update chat title if it's the first message
    const targetChat = currentChat || chats.find(chat => chat.id === chatId);
    if (!targetChat || targetChat.messages.length === 0) {
      updateChatTitle(chatId, inputMessage);
    }

    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send to all enabled platforms with individual context
      const aiResponsePromises = enabledPlatforms.map(async (platform) => {
        try {
          // Build agent-specific conversation history
          const conversationHistory = buildConversationHistoryForAgent(chatId, platform.id);
          conversationHistory.push({ role: 'user', content: messageToSend });

          // Add context about other enabled agents
          const otherAgents = enabledPlatforms.filter(p => p.id !== platform.id).map(p => p.name);
          if (otherAgents.length > 0) {
            const contextMessage = `Note: You are responding alongside these other AI agents: ${otherAgents.join(', ')}. You can reference their previous responses if relevant, and provide your unique perspective.`;
            conversationHistory.push({ role: 'user' as const, content: contextMessage });
          }

          const response = await callAIAPI(platform, conversationHistory);
          
          // Create individual message for this agent
          const agentMessage: Message = {
            id: `${platform.id}-${Date.now()}-${Math.random()}`,
            content: response,
            sender: 'ai',
            platform: platform.id,
            timestamp: new Date(),
          };
          
          addMessage(chatId, agentMessage);
          
          return { platform, content: response, success: true };
        } catch (error) {
          console.error(`Error calling ${platform.name}:`, error);
          
          // Create error message for this agent
          const errorMessage: Message = {
            id: `${platform.id}-error-${Date.now()}-${Math.random()}`,
            content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
            sender: 'ai',
            platform: platform.id,
            timestamp: new Date(),
          };
          
          addMessage(chatId, errorMessage);
          
          return { platform, content: '', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      await Promise.allSettled(aiResponsePromises);

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to get responses from AI platforms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/auth';
    } catch (error: any) {
      toast.error('Error signing out: ' + error.message);
    }
  };

  const togglePlatform = async (platformId: string) => {
    console.log('togglePlatform called for:', platformId);
    const platform = platforms.find(p => p.id === platformId);
    console.log('Platform found:', platform);
    
    if (!platform) {
      console.log('Platform not found');
      return;
    }
    
    if (!platform.hasApiKey) {
      toast.error('Please add an API key for this platform first');
      return;
    }

    const newEnabled = !platform.enabled;
    console.log('Setting enabled to:', newEnabled);
    
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, enabled: newEnabled } : p
    ));

    // Save to database
    await saveAgentSetting(platformId, newEnabled);
    console.log('Platform toggle saved to database');
  };

  const handleApiKeyDialogClose = (open: boolean) => {
    setShowApiKeyDialog(open);
    if (!open) {
      // Reload API keys status when dialog closes
      loadApiKeysStatus();
    }
  };

  const handleViewBotHistory = (platform: AIPlatform) => {
    setSelectedPlatformForHistory(platform);
    setShowBotHistoryDialog(true);
  };

  const handleSendMessageToSpecificBot = async (message: string, platformId: string) => {
    if (!activeChat) return;

    const platform = platforms.find(p => p.id === platformId);
    if (!platform || !platform.hasApiKey) {
      toast.error(`${platform?.name || 'Platform'} is not available or missing API key`);
      return;
    }

    // Add user message to the main chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: message,
      sender: 'user',
      timestamp: new Date(),
    };

    addMessage(activeChat, userMessage);

    // Update chat title if it's the first message
    const currentChat = getCurrentChat();
    if (currentChat && currentChat.messages.length === 0) {
      updateChatTitle(activeChat, message);
    }

    setIsLoading(true);

    try {
      // Build agent-specific conversation history
      const conversationHistory = buildConversationHistoryForAgent(activeChat, platformId);
      conversationHistory.push({ role: 'user', content: message });

      // Call the specific AI platform
      const response = await callAIAPI(platform, conversationHistory);

      // Create a message with this platform's response
      const platformMessage: Message = {
        id: `${platform.id}-${Date.now()}-${Math.random()}`,
        content: response,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
      };
      
      addMessage(activeChat, platformMessage);

    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
      };
      
      addMessage(activeChat, errorMessage);
      toast.error(`Failed to get response from ${platform.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChat = getCurrentChat();

  // Authentication state management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          setTimeout(() => {
            // Load user data after sign in
            console.log('User signed in:', session?.user);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user is available
  useEffect(() => {
    if (user) {
      loadConversations();
      loadAgentSettings();
      loadApiKeysStatus();
    }
  }, [user]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (user === null && session === null) {
      // Check if we've finished loading auth state
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          window.location.href = '/auth';
        }
      });
    }
  }, [user, session]);

  // Show loading while checking auth
  if (user === null && session === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-cyber-bg font-cyber text-cyber-text">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-cyber-primary/30 bg-cyber-surface/50 backdrop-blur-sm`}>
        <div className="p-4 border-b border-cyber-primary/30">
          <Button 
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-gradient-to-r from-cyber-primary to-cyber-accent hover:from-cyber-primary/80 hover:to-cyber-accent/80 text-cyber-bg font-semibold text-base mb-2 cyber-glow"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </Button>
          
          <Dialog open={showApiKeyDialog} onOpenChange={handleApiKeyDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 mb-2 border-cyber-secondary/50 text-cyber-text hover:bg-cyber-secondary/20 text-base">
                <Key className="w-5 h-5" />
                API Keys
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-cyber-surface border-cyber-primary/30">
              <DialogHeader>
                <DialogTitle className="text-cyber-text text-xl font-bold">API Key Settings</DialogTitle>
              </DialogHeader>
              <ApiKeySettings />
            </DialogContent>
          </Dialog>

          {user && (
            <div className="flex items-center gap-2 p-3 bg-cyber-surface/50 rounded-lg border border-cyber-primary/20">
              <Avatar className="w-9 h-9 border border-cyber-primary/30">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-cyber-primary text-cyber-bg font-bold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-cyber-text">
                  {user.user_metadata?.full_name || user.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0 hover:bg-cyber-danger/20 text-cyber-danger"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {chats.map((chat) => (
              <Card 
                key={chat.id} 
                className={`cursor-pointer transition-all hover:shadow-lg border ${
                  activeChat === chat.id 
                    ? 'border-cyber-primary bg-cyber-primary/10 cyber-glow' 
                    : 'border-cyber-surface hover:border-cyber-primary/50 bg-cyber-surface/30'
                }`}
                onClick={() => setActiveChat(chat.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-cyber-primary" />
                    <span className="font-medium text-sm truncate text-cyber-text">{chat.title}</span>
                  </div>
                  <div className="text-xs text-cyber-muted">
                    {chat.messages.length} messages
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-cyber-primary/30 bg-cyber-surface/50 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-cyber-primary hover:bg-cyber-primary/20"
              >
                <History className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyber-primary via-cyber-accent to-cyber-secondary bg-clip-text text-transparent text-glow">
                Multi-AI Chat
              </h1>
            </div>
            
            {/* Platform Toggles with Chat Buttons */}
            <div className="flex items-center gap-6">
              {platforms.map((platform) => (
                <div key={platform.id} className="flex items-center gap-3">
                  <span className="text-lg">{platform.icon}</span>
                  <span className="text-base font-medium text-cyber-text">{platform.name}</span>
                  <Switch
                    checked={platform.enabled && platform.hasApiKey}
                    onCheckedChange={() => togglePlatform(platform.id)}
                    disabled={!platform.hasApiKey}
                    className="data-[state=checked]:bg-cyber-primary"
                  />
                  {!platform.hasApiKey && (
                    <Badge variant="destructive" className="text-xs bg-cyber-danger text-cyber-text">No Key</Badge>
                  )}
                  {platform.hasApiKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBotHistory(platform)}
                      className={`h-7 px-3 text-xs font-medium border ${
                        platform.id === 'openai' ? 'border-agent-openai text-agent-openai hover:bg-agent-openai/20' :
                        platform.id === 'anthropic' ? 'border-agent-anthropic text-agent-anthropic hover:bg-agent-anthropic/20' :
                        'border-agent-deepseek text-agent-deepseek hover:bg-agent-deepseek/20'
                      }`}
                    >
                      Chat
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {currentChat?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  <Card className={`border ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-cyber-primary to-cyber-accent text-cyber-bg border-cyber-primary cyber-glow' 
                      : 'bg-cyber-surface/70 border-cyber-primary/30 text-cyber-text'
                  }`}>
                    <CardContent className="p-4">
                      {message.sender === 'ai' && message.platform && (
                        <div className="mb-2 flex items-center gap-2">
                          <Badge className={`${
                            message.platform === 'openai' ? 'bg-agent-openai border-agent-openai text-cyber-bg' :
                            message.platform === 'anthropic' ? 'bg-agent-anthropic border-agent-anthropic text-cyber-bg' :
                            message.platform === 'deepseek' ? 'bg-agent-deepseek border-agent-deepseek text-cyber-bg' :
                            'bg-cyber-primary border-cyber-primary text-cyber-bg'
                          } font-semibold cyber-glow`}>
                            {platforms.find(p => p.id === message.platform)?.icon} {platforms.find(p => p.id === message.platform)?.name}
                          </Badge>
                        </div>
                      )}
                      <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${
                        message.sender === 'ai' ? 'prose prose-sm max-w-none text-cyber-text' : ''
                      }`}>
                        {message.content}
                      </div>
                      <div className={`text-sm mt-3 font-medium ${
                        message.sender === 'user' ? 'text-cyber-bg/80' : 'text-cyber-muted'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-cyber-surface/70 border-cyber-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-cyber-primary rounded-full animate-bounce cyber-glow"></div>
                        <div className="w-3 h-3 bg-cyber-accent rounded-full animate-bounce cyber-glow" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-3 h-3 bg-cyber-secondary rounded-full animate-bounce cyber-glow" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-base text-cyber-muted font-medium">AI platforms are thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-cyber-primary/30 bg-cyber-surface/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask all enabled AI platforms..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="flex-1 bg-cyber-surface/70 border-cyber-primary/30 focus:border-cyber-primary text-cyber-text placeholder:text-cyber-muted text-base font-medium"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-cyber-primary to-cyber-accent hover:from-cyber-primary/80 hover:to-cyber-accent/80 text-cyber-bg font-semibold cyber-glow"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="mt-3 text-sm text-cyber-muted text-center font-medium">
              {platforms.filter(p => p.enabled && p.hasApiKey).length} AI platform(s) enabled
            </div>
          </div>
        </div>
      </div>

      {/* Bot Chat Dialog */}
      <BotHistoryDialog
        open={showBotHistoryDialog}
        onOpenChange={setShowBotHistoryDialog}
        platform={selectedPlatformForHistory}
        currentChat={getCurrentChat()}
        onSendMessage={handleSendMessageToSpecificBot}
      />
    </div>
  );
};

export default Index;
