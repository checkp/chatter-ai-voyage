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
      color: 'bg-green-500', 
      icon: '🤖',
      hasApiKey: false
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      enabled: false,
      color: 'bg-purple-500', 
      icon: '🎭',
      hasApiKey: false
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      enabled: false, 
      color: 'bg-blue-500', 
      icon: '🔍',
      hasApiKey: false
    },
  ]);

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showBotHistoryDialog, setShowBotHistoryDialog] = useState(false);
  const [selectedPlatformForHistory, setSelectedPlatformForHistory] = useState<AIPlatform | null>(null);

  // Load API keys status from Supabase
  const loadApiKeysStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('platform, encrypted_key')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading API keys:', error);
        return;
      }

      const availablePlatforms = data?.map(key => key.platform) || [];
      
      setPlatforms(prev => prev.map(platform => ({
        ...platform,
        hasApiKey: availablePlatforms.includes(platform.id)
      })));
    } catch (error: any) {
      console.error('Failed to load API keys status:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, activeChat]);

  useEffect(() => {
    // Create initial chat if none exists
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  // Load API keys status when user changes
  useEffect(() => {
    if (user) {
      loadApiKeysStatus();
    }
  }, [user]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat.id);
  };

  const getCurrentChat = () => {
    return chats.find(chat => chat.id === activeChat);
  };

  const updateChatTitle = (chatId: string, firstMessage: string) => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, title } : chat
    ));
  };

  const addMessage = (chatId: string, message: Message) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const updatedMessages = [...chat.messages, message];
        return {
          ...chat,
          messages: updatedMessages,
          lastUpdated: new Date(),
        };
      }
      return chat;
    }));
  };

  const buildConversationHistory = (chatId: string): Array<{role: 'user' | 'assistant', content: string}> => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return [];

    return chat.messages.map(message => ({
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: message.sender === 'ai' && message.platform 
        ? `[${platforms.find(p => p.id === message.platform)?.name}]: ${message.content}`
        : message.content
    }));
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
    if (!inputMessage.trim() || !activeChat) return;

    const currentChat = getCurrentChat();
    if (!currentChat) return;

    const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
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

    addMessage(activeChat, userMessage);

    // Update chat title if it's the first message
    if (currentChat.messages.length === 0) {
      updateChatTitle(activeChat, inputMessage);
    }

    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history including the new user message
      const conversationHistory = buildConversationHistory(activeChat);
      conversationHistory.push({ role: 'user', content: messageToSend });

      // Add context about enabled agents to the conversation
      const enabledAgentNames = enabledPlatforms.map(p => p.name).join(', ');
      const contextMessage = `Note: You are responding alongside these other AI agents: ${enabledAgentNames}. Please provide a unique perspective while being aware that users will see all responses together.`;
      
      const contextualHistory = [
        ...conversationHistory,
        { role: 'user' as const, content: contextMessage }
      ];

      // Collect all AI responses
      const aiResponses: Array<{platform: AIPlatform, content: string, error?: string}> = [];

      // Send to all enabled platforms with API keys
      const promises = enabledPlatforms.map(async (platform) => {
        try {
          const response = await callAIAPI(platform, contextualHistory);
          aiResponses.push({
            platform,
            content: response
          });
        } catch (error) {
          console.error(`Error calling ${platform.name}:`, error);
          aiResponses.push({
            platform,
            content: '',
            error: error instanceof Error ? error.message : 'Failed to get response from ' + platform.name
          });
        }
      });

      await Promise.allSettled(promises);

      // Create consolidated response message
      let consolidatedContent = '';
      
      aiResponses.forEach((response, index) => {
        const platformIcon = response.platform.icon;
        const platformName = response.platform.name;
        
        if (index > 0) {
          consolidatedContent += '\n\n---\n\n';
        }
        
        consolidatedContent += `**${platformIcon} ${platformName}:**\n\n`;
        
        if (response.error) {
          consolidatedContent += `❌ Error: ${response.error}`;
        } else {
          consolidatedContent += response.content;
        }
      });

      // Add single consolidated message
      const consolidatedMessage: Message = {
        id: `consolidated-${Date.now()}`,
        content: consolidatedContent,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      addMessage(activeChat, consolidatedMessage);

    } catch (error) {
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

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, enabled: !p.enabled } : p
    ));
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
      // Build conversation history including the new user message
      const conversationHistory = buildConversationHistory(activeChat);
      conversationHistory.push({ role: 'user', content: message });

      // Call the specific AI platform
      const response = await callAIAPI(platform, conversationHistory);

      // Create a message with just this platform's response
      const platformMessage: Message = {
        id: `${platform.id}-${Date.now()}`,
        content: `**${platform.icon} ${platform.name}:**\n\n${response}`,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      addMessage(activeChat, platformMessage);

    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `**${platform.icon} ${platform.name}:**\n\n❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        sender: 'ai',
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
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white/80 backdrop-blur-sm`}>
        <div className="p-4 border-b border-gray-200">
          <Button 
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 mb-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          
          <Dialog open={showApiKeyDialog} onOpenChange={handleApiKeyDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 mb-2">
                <Key className="w-4 h-4" />
                API Keys
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>API Key Settings</DialogTitle>
              </DialogHeader>
              <ApiKeySettings />
            </DialogContent>
          </Dialog>

          {user && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.user_metadata?.full_name || user.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0"
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
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeChat === chat.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setActiveChat(chat.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm truncate">{chat.title}</span>
                  </div>
                  <div className="text-xs text-gray-500">
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
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <History className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Multi-AI Chat
              </h1>
            </div>
            
            {/* Platform Toggles with Chat Buttons */}
            <div className="flex items-center gap-4">
              {platforms.map((platform) => (
                <div key={platform.id} className="flex items-center gap-2">
                  <span className="text-sm font-medium">{platform.icon}</span>
                  <span className="text-sm">{platform.name}</span>
                  <Switch
                    checked={platform.enabled && platform.hasApiKey}
                    onCheckedChange={() => togglePlatform(platform.id)}
                    disabled={!platform.hasApiKey}
                  />
                  {!platform.hasApiKey && (
                    <Badge variant="destructive" className="text-xs">No Key</Badge>
                  )}
                  {platform.hasApiKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBotHistory(platform)}
                      className="h-6 px-2 text-xs"
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
                  <Card className={`${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                      : 'bg-white shadow-sm border'
                  }`}>
                    <CardContent className="p-3">
                      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        message.sender === 'ai' ? 'prose prose-sm max-w-none' : ''
                      }`}>
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
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
                <Card className="bg-white shadow-sm border">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI platforms are thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask all enabled AI platforms..."
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isLoading}
                className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center">
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
