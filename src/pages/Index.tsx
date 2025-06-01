import React, { useState } from 'react';
import { Send, Plus, MessageSquare, Settings, History, Key, LogOut, User, Trash2, Square, AlertTriangle } from 'lucide-react';
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
import type { Message, AIPlatform } from '@/types/chat';
import MessageStatus from '@/components/chat/MessageStatus';
import PlatformStatus from '@/components/chat/PlatformStatus';
import { useSimpleDiscussion } from '@/hooks/useSimpleDiscussion';

const Index = () => {
  const { user, session, handleSignOut } = useAuth();
  const { chats, activeChat, setActiveChat, getCurrentChat, addMessage, updateChatTitle, createNewChat, deleteChat } = useChats(user);
  const { platforms, togglePlatform, callAIAPI, loadApiKeysStatus } = usePlatforms(user);
  const { messagesEndRef } = useScrollToBottom([activeChat, getCurrentChat()?.messages?.length]);

  // Use the simplified discussion hook
  const { 
    startDiscussion, 
    stopDiscussion,
    forceStop,
    isDiscussionActive, 
    activeResponders, 
    roundCount, 
    maxRounds, 
    platformStatuses,
    errors,
    setMaxRounds 
  } = useSimpleDiscussion(platforms, callAIAPI, addMessage, getCurrentChat);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showBotHistoryDialog, setShowBotHistoryDialog] = useState(false);
  const [selectedPlatformForHistory, setSelectedPlatformForHistory] = useState<AIPlatform | null>(null);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    let chatId = activeChat;
    
    if (!chatId) {
      chatId = await createNewChat();
    }

    const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
    
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
      await startDiscussion(chatId, userMessage, enabledPlatforms);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to start discussion with AI platforms');
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
      <div className="h-screen flex items-center justify-center bg-pastel-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pastel-primary mx-auto mb-4"></div>
          <p className="text-pastel-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-pastel-bg font-sans text-pastel-text">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-pastel-primary/30 bg-gradient-to-b from-pastel-surface to-pastel-surface/70 backdrop-blur-md`}>
        <div className="p-4 border-b border-pastel-primary/30">
          <Button 
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-gradient-to-r from-pastel-primary to-pastel-accent hover:from-pastel-primary/80 hover:to-pastel-accent/80 text-pastel-text font-semibold text-base mb-3 shadow-lg hover:shadow-xl transition-all duration-200 animate-float"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </Button>
          
          <Dialog open={showApiKeyDialog} onOpenChange={handleApiKeyDialogClose}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 mb-3 border-pastel-secondary/50 text-pastel-text hover:bg-pastel-secondary/20 text-base shadow-sm">
                <Key className="w-5 h-5" />
                API Keys
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-pastel-surface border-pastel-primary/30 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-pastel-text text-xl font-bold">API Key Settings</DialogTitle>
              </DialogHeader>
              <ApiKeySettings />
            </DialogContent>
          </Dialog>

          {user && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-pastel-surface to-pastel-primary/10 rounded-xl border border-pastel-primary/20 shadow-sm">
              <Avatar className="w-10 h-10 border-2 border-pastel-primary/30 shadow-md">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-pastel-primary text-pastel-text font-bold text-lg">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-pastel-text">
                  {user.user_metadata?.full_name || user.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0 hover:bg-pastel-danger/20 text-pastel-danger"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {chats.map((chat) => (
              <Card 
                key={chat.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg border group hover:scale-[1.02] ${
                  activeChat === chat.id 
                    ? 'border-pastel-primary bg-gradient-to-r from-pastel-primary/20 to-pastel-accent/20 shadow-md' 
                    : 'border-pastel-surface hover:border-pastel-primary/50 bg-pastel-surface/50 hover:bg-pastel-surface/80'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 mb-2 flex-1 min-w-0"
                      onClick={() => setActiveChat(chat.id)}
                    >
                      <MessageSquare className="w-4 h-4 text-pastel-primary flex-shrink-0" />
                      <span className="font-medium text-sm truncate text-pastel-text">{chat.title}</span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-pastel-danger/20 text-pastel-danger opacity-60 group-hover:opacity-100 transition-opacity ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-pastel-surface border-pastel-primary/30 shadow-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-pastel-text">Delete Chat</AlertDialogTitle>
                          <AlertDialogDescription className="text-pastel-muted">
                            Are you sure you want to delete "{chat.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-pastel-primary/30 text-pastel-text hover:bg-pastel-surface/80">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteChat(chat.id)}
                            className="bg-pastel-danger hover:bg-pastel-danger/80 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="text-xs text-pastel-muted font-medium">
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
        <div className="border-b border-pastel-primary/30 bg-gradient-to-r from-pastel-surface to-pastel-surface/70 backdrop-blur-md p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-pastel-primary hover:bg-pastel-primary/20 shadow-sm"
              >
                <History className="w-5 h-5" />
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pastel-primary via-pastel-accent to-pastel-secondary bg-clip-text text-transparent">
                Multi-AI Chat
              </h1>
              
              {/* Improved Discussion Controls */}
              <div className="flex items-center gap-3">
                {isDiscussionActive && (
                  <>
                    <Button
                      onClick={stopDiscussion}
                      variant="outline"
                      size="sm"
                      className="border-pastel-danger text-pastel-danger hover:bg-pastel-danger/20 shadow-sm"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Discussion
                    </Button>
                    <Button
                      onClick={forceStop}
                      variant="outline"
                      size="sm"
                      className="border-pastel-danger text-pastel-danger hover:bg-pastel-danger/20 shadow-sm"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Force Stop
                    </Button>
                  </>
                )}
                
                {isDiscussionActive && (
                  <div className="text-sm text-pastel-muted bg-pastel-surface/50 px-3 py-1 rounded-full">
                    Round {roundCount}/{maxRounds} • {activeResponders.length} active
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {platforms.map((platform) => (
                <div key={platform.id} className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <span className="text-base font-medium text-pastel-text">{platform.name}</span>
                  <Switch
                    checked={platform.enabled && platform.hasApiKey}
                    onCheckedChange={() => togglePlatform(platform.id)}
                    disabled={!platform.hasApiKey}
                    className={`data-[state=checked]:${
                      platform.id === 'openai' ? 'bg-agent-openai' :
                      platform.id === 'anthropic' ? 'bg-agent-anthropic' :
                      platform.id === 'deepseek' ? 'bg-agent-deepseek' :
                      platform.id === 'grok' ? 'bg-agent-grok' :
                      'bg-pastel-primary'
                    }`}
                  />
                  {!platform.hasApiKey && (
                    <Badge variant="destructive" className="text-xs bg-pastel-danger text-white">No Key</Badge>
                  )}
                  {platform.hasApiKey && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewBotHistory(platform)}
                        className={`h-8 px-3 text-xs font-medium border shadow-sm transition-all duration-200 hover:scale-105 ${
                          platform.id === 'openai' ? 'border-agent-openai text-agent-openai hover:bg-agent-openai/20' :
                          platform.id === 'anthropic' ? 'border-agent-anthropic text-agent-anthropic hover:bg-agent-anthropic/20' :
                          platform.id === 'deepseek' ? 'border-agent-deepseek text-agent-deepseek hover:bg-agent-deepseek/20' :
                          platform.id === 'grok' ? 'border-agent-grok text-agent-grok hover:bg-agent-grok/20' :
                          'border-pastel-primary text-pastel-primary hover:bg-pastel-primary/20'
                        }`}
                      >
                        Chat
                      </Button>
                      <PlatformStatus 
                        platform={platform}
                        status={platformStatuses.get(platform.id) || 'idle'}
                        error={errors.get(platform.id)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-pastel-bg to-pastel-surface/30">
          <div className="max-w-4xl mx-auto space-y-6">
            {currentChat?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  <Card className={`border transition-all duration-200 hover:shadow-lg ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-pastel-primary to-pastel-accent text-pastel-text border-pastel-primary shadow-md' 
                      : 'bg-pastel-surface/70 border-pastel-primary/30 text-pastel-text shadow-sm hover:shadow-md'
                  }`}>
                    <CardContent className="p-5">
                      {message.sender === 'ai' && message.platform && (
                        <div className="mb-3 flex items-center justify-between">
                          <Badge className={`font-semibold shadow-sm ${
                            message.platform === 'openai' ? 'bg-agent-openai border-agent-openai text-white' :
                            message.platform === 'anthropic' ? 'bg-agent-anthropic border-agent-anthropic text-white' :
                            message.platform === 'deepseek' ? 'bg-agent-deepseek border-agent-deepseek text-white' :
                            message.platform === 'grok' ? 'bg-agent-grok border-agent-grok text-white' :
                            'bg-pastel-primary border-pastel-primary text-white'
                          }`}>
                            {platforms.find(p => p.id === message.platform)?.icon} {platforms.find(p => p.id === message.platform)?.name}
                          </Badge>
                          <MessageStatus message={message} platforms={platforms} />
                        </div>
                      )}
                      <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${
                        message.sender === 'ai' ? 'prose prose-sm max-w-none text-pastel-text' : ''
                      }`}>
                        {message.content}
                      </div>
                      <div className={`text-sm mt-4 font-medium flex items-center justify-between ${
                        message.sender === 'user' ? 'text-pastel-text/80' : 'text-pastel-muted'
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
            
            {(isLoading || activeResponders.length > 0) && (
              <div className="flex justify-start">
                <Card className="bg-pastel-surface/70 border-pastel-primary/30 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-pastel-primary rounded-full animate-bounce shadow-sm"></div>
                        <div className="w-3 h-3 bg-pastel-accent rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-3 h-3 bg-pastel-secondary rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-base text-pastel-muted font-medium">
                        {activeResponders.length > 0 
                          ? `${activeResponders.length} AI platform(s) are responding...` 
                          : 'AI platforms are thinking...'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-pastel-primary/30 bg-gradient-to-r from-pastel-surface to-pastel-surface/70 backdrop-blur-md p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Start a discussion with AI platforms..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading || isDiscussionActive}
                className="flex-1 bg-pastel-surface/70 border-pastel-primary/30 focus:border-pastel-primary text-pastel-text placeholder:text-pastel-muted text-base font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || isDiscussionActive}
                className="bg-gradient-to-r from-pastel-primary to-pastel-accent hover:from-pastel-primary/80 hover:to-pastel-accent/80 text-pastel-text font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="mt-4 text-sm text-pastel-muted text-center font-medium bg-pastel-surface/30 py-2 rounded-lg">
              {isDiscussionActive 
                ? `Discussion active: Round ${roundCount}/${maxRounds} - ${platforms.filter(p => p.enabled && p.hasApiKey).length} AI platform(s) participating`
                : `${platforms.filter(p => p.enabled && p.hasApiKey).length} AI platform(s) enabled`}
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
