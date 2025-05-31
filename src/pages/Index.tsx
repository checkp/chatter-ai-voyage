import React, { useState } from 'react';
import { Send, Plus, MessageSquare, Settings, History, Key, LogOut, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import ApiKeySettings from '@/components/ApiKeySettings';
import BotHistoryDialog from '@/components/BotHistoryDialog';
import { useAuth } from '@/hooks/useAuth';
import { useChats } from '@/hooks/useChats';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { buildConversationHistoryForAgent } from '@/utils/chatUtils';
import type { Message, AIPlatform } from '@/types/chat';
import MessageStatus from '@/components/chat/MessageStatus';

const Index = () => {
  const { user, session, handleSignOut } = useAuth();
  const { chats, activeChat, setActiveChat, getCurrentChat, addMessage, updateChatTitle, createNewChat, deleteChat, updateMessageStatus } = useChats(user);
  const { platforms, togglePlatform, callAIAPI, loadApiKeysStatus } = usePlatforms(user);
  const { messagesEndRef } = useScrollToBottom([activeChat, getCurrentChat()?.messages?.length]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showBotHistoryDialog, setShowBotHistoryDialog] = useState(false);
  const [selectedPlatformForHistory, setSelectedPlatformForHistory] = useState<AIPlatform | null>(null);

  const processAIResponses = async (chatId: string, userMessage: Message, enabledPlatforms: AIPlatform[]) => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    // Process each AI platform sequentially to allow them to see each other's responses
    for (const platform of enabledPlatforms) {
      try {
        console.log(`Getting response from ${platform.name}...`);
        
        // Get the latest messages including any responses from previous AIs in this round
        const latestChat = getCurrentChat();
        if (!latestChat) continue;

        const allMessages = [...latestChat.messages, userMessage];
        
        // Mark as seen by this platform
        const messageIdsToMarkAsSeen = allMessages
          .filter(msg => msg.sender === 'ai' && msg.platform !== platform.id)
          .map(msg => msg.id);
        
        messageIdsToMarkAsSeen.forEach(msgId => {
          updateMessageStatus(chatId, msgId, 'seen', [platform.id]);
        });

        const response = await callAIAPI(platform, allMessages, enabledPlatforms);
        
        const agentMessage: Message = {
          id: crypto.randomUUID(),
          content: response,
          sender: 'ai',
          platform: platform.id,
          timestamp: new Date(),
          status: 'sent',
          seenBy: []
        };
        
        addMessage(chatId, agentMessage);
        console.log(`${platform.name} responded successfully`);
        
        // Small delay to allow UI to update and make conversation feel more natural
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error calling ${platform.name}:`, error);
        
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
          sender: 'ai',
          platform: platform.id,
          timestamp: new Date(),
          status: 'sent',
          seenBy: []
        };
        
        addMessage(chatId, errorMessage);
      }
    }
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage called');
    
    if (!inputMessage.trim()) {
      console.log('No input message');
      return;
    }
    
    let chatId = activeChat;
    
    if (!chatId) {
      console.log('No active chat, creating new one');
      chatId = await createNewChat();
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

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    addMessage(chatId, userMessage);

    const targetChat = chats.find(chat => chat.id === chatId);
    if (!targetChat || targetChat.messages.length === 0) {
      updateChatTitle(chatId, inputMessage);
    }

    setInputMessage('');
    setIsLoading(true);

    try {
      await processAIResponses(chatId, userMessage, enabledPlatforms);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to get responses from AI platforms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeyDialogClose = (open: boolean) => {
    setShowApiKeyDialog(open);
    if (!open) {
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

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    addMessage(activeChat, userMessage);

    const currentChat = getCurrentChat();
    if (currentChat && currentChat.messages.length === 0) {
      updateChatTitle(activeChat, message);
    }

    setIsLoading(true);

    try {
      const currentChatData = getCurrentChat();
      if (!currentChatData) return;

      const allMessages = [...currentChatData.messages, userMessage];
      const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);

      const response = await callAIAPI(platform, allMessages, enabledPlatforms);

      const platformMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      
      addMessage(activeChat, platformMessage);

    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        sender: 'ai',
        platform: platform.id,
        timestamp: new Date(),
        status: 'sent',
        seenBy: []
      };
      
      addMessage(activeChat, errorMessage);
      toast.error(`Failed to get response from ${platform.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChat = getCurrentChat();

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
                className={`cursor-pointer transition-all hover:shadow-lg border group ${
                  activeChat === chat.id 
                    ? 'border-cyber-primary bg-cyber-primary/10 cyber-glow' 
                    : 'border-cyber-surface hover:border-cyber-primary/50 bg-cyber-surface/30'
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-2 mb-1 flex-1 min-w-0"
                      onClick={() => setActiveChat(chat.id)}
                    >
                      <MessageSquare className="w-4 h-4 text-cyber-primary flex-shrink-0" />
                      <span className="font-medium text-sm truncate text-cyber-text">{chat.title}</span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-cyber-danger/20 text-cyber-danger opacity-70 group-hover:opacity-100 transition-opacity ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-cyber-surface border-cyber-primary/30">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-cyber-text">Delete Chat</AlertDialogTitle>
                          <AlertDialogDescription className="text-cyber-muted">
                            Are you sure you want to delete "{chat.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-cyber-primary/30 text-cyber-text hover:bg-cyber-surface/80">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteChat(chat.id)}
                            className="bg-cyber-danger hover:bg-cyber-danger/80 text-cyber-text"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                        platform.id === 'deepseek' ? 'border-agent-deepseek text-agent-deepseek hover:bg-agent-deepseek/20' :
                        platform.id === 'grok' ? 'border-agent-grok text-agent-grok hover:bg-agent-grok/20' :
                        'border-cyber-primary text-cyber-primary hover:bg-cyber-primary/20'
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
                        <div className="mb-2 flex items-center justify-between">
                          <Badge className={`${
                            message.platform === 'openai' ? 'bg-agent-openai border-agent-openai text-cyber-bg' :
                            message.platform === 'anthropic' ? 'bg-agent-anthropic border-agent-anthropic text-cyber-bg' :
                            message.platform === 'deepseek' ? 'bg-agent-deepseek border-agent-deepseek text-cyber-bg' :
                            message.platform === 'grok' ? 'bg-agent-grok border-agent-grok text-cyber-bg' :
                            'bg-cyber-primary border-cyber-primary text-cyber-bg'
                          } font-semibold cyber-glow`}>
                            {platforms.find(p => p.id === message.platform)?.icon} {platforms.find(p => p.id === message.platform)?.name}
                          </Badge>
                          <MessageStatus message={message} platforms={platforms} />
                        </div>
                      )}
                      <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${
                        message.sender === 'ai' ? 'prose prose-sm max-w-none text-cyber-text' : ''
                      }`}>
                        {message.content}
                      </div>
                      <div className={`text-sm mt-3 font-medium flex items-center justify-between ${
                        message.sender === 'user' ? 'text-cyber-bg/80' : 'text-cyber-muted'
                      }`}>
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.sender === 'user' && (
                          <MessageStatus message={message} platforms={platforms} />
                        )}
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
