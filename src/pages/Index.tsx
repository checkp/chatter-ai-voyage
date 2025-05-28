import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MessageSquare, Settings, History, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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
  apiKey?: string;
  endpoint?: string;
}

const Index = () => {
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
      enabled: true, 
      color: 'bg-green-500', 
      icon: '🤖',
      endpoint: 'https://api.openai.com/v1/chat/completions'
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      enabled: true, 
      color: 'bg-purple-500', 
      icon: '🎭',
      endpoint: 'https://api.anthropic.com/v1/messages'
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      enabled: true, 
      color: 'bg-blue-500', 
      icon: '🔍',
      endpoint: 'https://api.deepseek.com/v1/chat/completions'
    },
  ]);

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [tempApiKeys, setTempApiKeys] = useState<Record<string, string>>({});

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedKeys: Record<string, string> = {};
    platforms.forEach(platform => {
      const savedKey = localStorage.getItem(`apiKey_${platform.id}`);
      if (savedKey) {
        savedKeys[platform.id] = savedKey;
      }
    });
    setTempApiKeys(savedKeys);
    
    setPlatforms(prev => prev.map(platform => ({
      ...platform,
      apiKey: savedKeys[platform.id] || ''
    })));
  }, []);

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

  const callOpenAI = async (message: string, apiKey: string): Promise<string> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callAnthropic = async (message: string, apiKey: string): Promise<string> => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  };

  const callDeepSeek = async (message: string, apiKey: string): Promise<string> => {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: message }],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callAIAPI = async (platform: AIPlatform, message: string): Promise<string> => {
    if (!platform.apiKey) {
      throw new Error(`No API key configured for ${platform.name}`);
    }

    switch (platform.id) {
      case 'openai':
        return await callOpenAI(message, platform.apiKey);
      case 'anthropic':
        return await callAnthropic(message, platform.apiKey);
      case 'deepseek':
        return await callDeepSeek(message, platform.apiKey);
      default:
        throw new Error(`Unsupported platform: ${platform.id}`);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeChat) return;

    const currentChat = getCurrentChat();
    if (!currentChat) return;

    const enabledPlatforms = platforms.filter(p => p.enabled && p.apiKey);
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
      // Send to all enabled platforms with API keys
      const promises = enabledPlatforms.map(async (platform) => {
        try {
          const response = await callAIAPI(platform, messageToSend);
          const aiMessage: Message = {
            id: `${platform.id}-${Date.now()}-${Math.random()}`,
            content: response,
            sender: 'ai',
            platform: platform.id,
            timestamp: new Date(),
          };
          addMessage(activeChat, aiMessage);
        } catch (error) {
          console.error(`Error calling ${platform.name}:`, error);
          const errorMessage: Message = {
            id: `${platform.id}-error-${Date.now()}-${Math.random()}`,
            content: `Error: Failed to get response from ${platform.name}. Please check your API key.`,
            sender: 'ai',
            platform: platform.id,
            timestamp: new Date(),
          };
          addMessage(activeChat, errorMessage);
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      toast.error('Failed to get responses from AI platforms');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const saveApiKeys = () => {
    platforms.forEach(platform => {
      const key = tempApiKeys[platform.id];
      if (key) {
        localStorage.setItem(`apiKey_${platform.id}`, key);
      } else {
        localStorage.removeItem(`apiKey_${platform.id}`);
      }
    });

    setPlatforms(prev => prev.map(platform => ({
      ...platform,
      apiKey: tempApiKeys[platform.id] || ''
    })));

    setShowApiKeyDialog(false);
    toast.success('API keys saved successfully');
  };

  const updateTempApiKey = (platformId: string, key: string) => {
    setTempApiKeys(prev => ({
      ...prev,
      [platformId]: key
    }));
  };

  const currentChat = getCurrentChat();

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
          
          <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Key className="w-4 h-4" />
                API Keys
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configure API Keys</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {platforms.map((platform) => (
                  <div key={platform.id} className="space-y-2">
                    <Label htmlFor={platform.id}>
                      {platform.icon} {platform.name} API Key
                    </Label>
                    <Input
                      id={platform.id}
                      type="password"
                      placeholder={`Enter ${platform.name} API key`}
                      value={tempApiKeys[platform.id] || ''}
                      onChange={(e) => updateTempApiKey(platform.id, e.target.value)}
                    />
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveApiKeys}>
                    Save Keys
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
            
            {/* Platform Toggles */}
            <div className="flex items-center gap-4">
              {platforms.map((platform) => (
                <div key={platform.id} className="flex items-center gap-2">
                  <span className="text-sm font-medium">{platform.icon}</span>
                  <span className="text-sm">{platform.name}</span>
                  <Switch
                    checked={platform.enabled && !!platform.apiKey}
                    onCheckedChange={() => togglePlatform(platform.id)}
                    disabled={!platform.apiKey}
                  />
                  {!platform.apiKey && (
                    <Badge variant="destructive" className="text-xs">No Key</Badge>
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
                  {message.sender === 'ai' && message.platform && (
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={`${platforms.find(p => p.id === message.platform)?.color} text-white`}>
                        {platforms.find(p => p.id === message.platform)?.icon}
                        {platforms.find(p => p.id === message.platform)?.name}
                      </Badge>
                    </div>
                  )}
                  <Card className={`${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                      : 'bg-white shadow-sm border'
                  }`}>
                    <CardContent className="p-3">
                      <p className="text-sm leading-relaxed">{message.content}</p>
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
              {platforms.filter(p => p.enabled && p.apiKey).length} AI platform(s) enabled with API keys
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
