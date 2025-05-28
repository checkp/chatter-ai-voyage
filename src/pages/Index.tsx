
import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MessageSquare, Settings, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
}

const Index = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [platforms, setPlatforms] = useState<AIPlatform[]>([
    { id: 'chatgpt', name: 'ChatGPT', enabled: true, color: 'bg-green-500', icon: '🤖' },
    { id: 'grok', name: 'Grok', enabled: true, color: 'bg-blue-500', icon: '🚀' },
    { id: 'deepseek', name: 'DeepSeek', enabled: true, color: 'bg-purple-500', icon: '🔍' },
  ]);

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

  const simulateAIResponse = async (platform: AIPlatform, userMessage: string): Promise<string> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const responses = {
      chatgpt: [
        `As ChatGPT, I understand your question about "${userMessage.substring(0, 20)}...". Here's my perspective on this topic.`,
        `That's an interesting point. From ChatGPT's viewpoint, I would suggest considering multiple angles to this question.`,
        `Thank you for asking. As ChatGPT, I can provide you with a comprehensive answer based on my training data.`,
      ],
      grok: [
        `Grok here! 🚀 Your question about "${userMessage.substring(0, 20)}..." is quite intriguing. Let me break this down for you.`,
        `Well, well! Grok's take on this: that's a fascinating query that deserves a thorough exploration.`,
        `Grok reporting! This is definitely worth discussing. Here's my analysis of your question.`,
      ],
      deepseek: [
        `DeepSeek analysis: "${userMessage.substring(0, 20)}..." - This requires deep consideration and careful examination.`,
        `From DeepSeek's analytical perspective, this question opens up several important pathways for exploration.`,
        `DeepSeek processing complete. Your inquiry touches on several key concepts that warrant detailed discussion.`,
      ],
    };
    
    const platformResponses = responses[platform.id as keyof typeof responses] || ['Default response'];
    return platformResponses[Math.floor(Math.random() * platformResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeChat) return;

    const currentChat = getCurrentChat();
    if (!currentChat) return;

    const enabledPlatforms = platforms.filter(p => p.enabled);
    if (enabledPlatforms.length === 0) {
      toast.error('Please enable at least one AI platform');
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
      // Send to all enabled platforms
      const promises = enabledPlatforms.map(async (platform) => {
        const response = await simulateAIResponse(platform, messageToSend);
        const aiMessage: Message = {
          id: `${platform.id}-${Date.now()}-${Math.random()}`,
          content: response,
          sender: 'ai',
          platform: platform.id,
          timestamp: new Date(),
        };
        addMessage(activeChat, aiMessage);
      });

      await Promise.all(promises);
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

  const currentChat = getCurrentChat();

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white/80 backdrop-blur-sm`}>
        <div className="p-4 border-b border-gray-200">
          <Button 
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
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
                    checked={platform.enabled}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
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
              {platforms.filter(p => p.enabled).length} AI platform(s) enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
