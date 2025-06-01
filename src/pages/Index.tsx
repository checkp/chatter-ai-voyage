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
import { ThemeSelector } from '@/components/ui/theme-selector';
import { useAuth } from '@/hooks/useAuth';
import { useChats } from '@/hooks/useChats';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import type { Message, AIPlatform } from '@/types/chat';
import MessageStatus from '@/components/chat/MessageStatus';
import PlatformStatus from '@/components/chat/PlatformStatus';
import { useMultiRoundDiscussion } from '@/hooks/useMultiRoundDiscussion';

const Index = () => {
  const { user, session, handleSignOut } = useAuth();
  const { chats, activeChat, setActiveChat, getCurrentChat, addMessage, updateChatTitle, createNewChat, deleteChat } = useChats(user);
  const { platforms, togglePlatform, callAIAPI, loadApiKeysStatus } = usePlatforms(user);
  const { messagesEndRef } = useScrollToBottom([activeChat, getCurrentChat()?.messages?.length]);

  // Use the enhanced multi-round discussion hook
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
    discussionSummary,
    setMaxRounds 
  } = useMultiRoundDiscussion(platforms, callAIAPI, addMessage, getCurrentChat);

  const [inputMessage, setInputMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showBotHistoryDialog, setShowBotHistoryDialog] = useState(false);
  const [selectedPlatformForHistory, setSelectedPlatformForHistory] = useState<AIPlatform | null>(null);

  const getAgentMessageColors = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-green-100',
          border: 'border-emerald-200',
          glow: 'hover:shadow-emerald-200/50'
        };
      case 'anthropic':
        return {
          bg: 'bg-gradient-to-br from-orange-50 to-amber-100',
          border: 'border-orange-200',
          glow: 'hover:shadow-orange-200/50'
        };
      case 'deepseek':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
          border: 'border-blue-200',
          glow: 'hover:shadow-blue-200/50'
        };
      case 'grok':
        return {
          bg: 'bg-gradient-to-br from-purple-50 to-violet-100',
          border: 'border-purple-200',
          glow: 'hover:shadow-purple-200/50'
        };
      default:
        return {
          bg: 'modern-card-elevated',
          border: 'modern-border',
          glow: 'hover:shadow-xl'
        };
    }
  };

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

    // Add user message to chat
    addMessage(chatId, userMessage);

    // Update chat title if this is the first message
    const targetChat = chats.find(chat => chat.id === chatId);
    if (!targetChat || targetChat.messages.length === 0) {
      updateChatTitle(chatId, inputMessage);
    }

    setInputMessage('');

    try {
      // Start the multi-round discussion
      await startDiscussion(chatId, userMessage, enabledPlatforms);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to start discussion with AI platforms');
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
    }
  };

  const currentChat = getCurrentChat();

  if (user === null && session === null) {
    return (
      <div className="h-screen flex items-center justify-center modern-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent modern-glow mx-auto mb-6"
               style={{ 
                 borderTopColor: 'hsl(var(--modern-accent-primary))',
                 borderRightColor: 'hsl(var(--modern-accent-secondary))'
               }}>
          </div>
          <p className="modern-text-primary text-lg font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex modern-bg-primary modern-text-primary font-inter">
      {/* Modern Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-500 ease-out overflow-hidden`}>
        <div className="h-full glass-morphism modern-border-r p-6 flex flex-col">
          {/* Sidebar Header */}
          <div className="space-y-4 mb-6">
            <Button 
              onClick={createNewChat}
              className="w-full modern-btn-primary text-base font-semibold py-4 modern-float modern-glow-hover gap-3"
            >
              <Plus className="w-5 h-5" />
              New Conversation
            </Button>
            
            <div className="flex gap-2">
              <Dialog open={showApiKeyDialog} onOpenChange={handleApiKeyDialogClose}>
                <DialogTrigger asChild>
                  <Button className="flex-1 modern-btn-secondary">
                    <Key className="w-4 h-4 mr-2" />
                    API Keys
                  </Button>
                </DialogTrigger>
                <DialogContent className="modern-dialog sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="modern-text-primary text-2xl font-bold">API Configuration</DialogTitle>
                  </DialogHeader>
                  <ApiKeySettings />
                </DialogContent>
              </Dialog>
              
              <ThemeSelector />
            </div>

            {user && (
              <div className="modern-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 modern-avatar-ring">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="modern-bg-secondary modern-text-primary font-bold text-lg">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate modern-text-primary">
                      {user.user_metadata?.full_name || user.email}
                    </div>
                    <div className="text-xs modern-text-muted">Online</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="h-8 w-8 p-0 modern-text-muted hover:modern-text-primary"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {chats.map((chat) => (
                <Card 
                  key={chat.id} 
                  className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] modern-glow-hover group ${
                    activeChat === chat.id 
                      ? 'modern-card-selected modern-glow' 
                      : 'modern-card hover:shadow-lg'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 mb-3 flex-1 min-w-0"
                        onClick={() => setActiveChat(chat.id)}
                      >
                        <div className="w-2 h-2 rounded-full"
                             style={{ backgroundColor: 'hsl(var(--modern-accent-primary))' }}>
                        </div>
                        <span className="font-semibold text-sm truncate modern-text-primary">{chat.title}</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 modern-text-muted hover:modern-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="modern-dialog">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="modern-text-primary">Delete Conversation</AlertDialogTitle>
                            <AlertDialogDescription className="modern-text-muted">
                              Are you sure you want to delete "{chat.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="modern-btn-secondary">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteChat(chat.id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="text-xs modern-text-muted font-medium flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" />
                      {chat.messages.length} messages
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Modern Header */}
        <div className="glass-morphism modern-border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="modern-btn-ghost"
              >
                <History className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent modern-float">
                  Multi-AI Studio
                </h1>
                <p className="modern-text-muted text-sm font-medium mt-1">
                  Collaborate with multiple AI platforms
                </p>
              </div>
              
              {/* Enhanced Discussion Controls */}
              <div className="flex items-center gap-3">
                {isDiscussionActive && (
                  <>
                    <Button
                      onClick={stopDiscussion}
                      className="modern-btn-secondary border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Discussion
                    </Button>
                    <Button
                      onClick={forceStop}
                      className="modern-btn-secondary border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Force Stop
                    </Button>
                  </>
                )}
                
                {isDiscussionActive && (
                  <div className="modern-card px-4 py-2">
                    <div className="text-sm modern-text-muted font-medium">
                      Round {roundCount}/{maxRounds} • {activeResponders.length} responding
                    </div>
                    {discussionSummary.length > 0 && (
                      <div className="text-xs modern-text-accent mt-1">
                        {discussionSummary[0]}
                      </div>
                    )}
                  </div>
                )}

                {/* Max Rounds Control */}
                {!isDiscussionActive && (
                  <div className="modern-card px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm modern-text-muted font-medium">Max Rounds:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMaxRounds(Math.max(1, maxRounds - 1))}
                        className="h-6 w-6 p-0"
                      >
                        -
                      </Button>
                      <span className="text-sm font-bold modern-text-primary min-w-[2ch] text-center">
                        {maxRounds}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMaxRounds(Math.min(10, maxRounds + 1))}
                        className="h-6 w-6 p-0"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Platform Controls */}
            <div className="flex items-center gap-6">
              {platforms.map((platform) => (
                <div key={platform.id} className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold modern-text-primary">{platform.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Switch
                        checked={platform.enabled && platform.hasApiKey}
                        onCheckedChange={() => togglePlatform(platform.id)}
                        disabled={!platform.hasApiKey}
                        className={`data-[state=checked]:${
                          platform.id === 'openai' ? 'modern-bg-agent-openai' :
                          platform.id === 'anthropic' ? 'modern-bg-agent-anthropic' :
                          platform.id === 'deepseek' ? 'modern-bg-agent-deepseek' :
                          platform.id === 'grok' ? 'modern-bg-agent-grok' :
                          'bg-amber-500'
                        }`}
                      />
                      {!platform.hasApiKey && (
                        <Badge variant="destructive" className="text-xs">No Key</Badge>
                      )}
                      {platform.hasApiKey && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBotHistory(platform)}
                            className={`h-7 px-3 text-xs font-medium border transition-all duration-200 hover:scale-105 ${
                              platform.id === 'openai' ? 'modern-border-agent-openai modern-agent-openai hover:modern-bg-agent-openai hover:text-white' :
                              platform.id === 'anthropic' ? 'modern-border-agent-anthropic modern-agent-anthropic hover:modern-bg-agent-anthropic hover:text-white' :
                              platform.id === 'deepseek' ? 'modern-border-agent-deepseek modern-agent-deepseek hover:modern-bg-agent-deepseek hover:text-white' :
                              platform.id === 'grok' ? 'modern-border-agent-grok modern-agent-grok hover:modern-bg-agent-grok hover:text-white' :
                              'modern-border modern-text-accent hover:bg-amber-500 hover:text-white'
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-8 modern-bg-secondary">
          <div className="max-w-5xl mx-auto space-y-8">
            {currentChat?.messages.map((message) => {
              const agentColors = message.sender === 'ai' && message.platform 
                ? getAgentMessageColors(message.platform)
                : null;

              return (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] modern-enter ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                    <Card className={`transition-all duration-300 hover:shadow-xl modern-glow-hover ${
                      message.sender === 'user' 
                        ? 'modern-card-elevated bg-gradient-to-br from-amber-100 to-orange-100 border-amber-200' 
                        : agentColors 
                          ? `${agentColors.bg} ${agentColors.border} ${agentColors.glow} hover:scale-[1.01]`
                          : 'modern-card-elevated hover:scale-[1.01]'
                    }`}>
                      <CardContent className="p-6">
                        {message.sender === 'ai' && message.platform && (
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={`font-semibold text-white px-3 py-1 ${
                                message.platform === 'openai' ? 'modern-bg-agent-openai' :
                                message.platform === 'anthropic' ? 'modern-bg-agent-anthropic' :
                                message.platform === 'deepseek' ? 'modern-bg-agent-deepseek' :
                                message.platform === 'grok' ? 'modern-bg-agent-grok' :
                                'bg-amber-500'
                              }`}>
                                {platforms.find(p => p.id === message.platform)?.icon} {platforms.find(p => p.id === message.platform)?.name}
                              </Badge>
                              {message.roundNumber && (
                                <Badge variant="outline" className="text-xs modern-text-muted">
                                  Round {message.roundNumber}
                                </Badge>
                              )}
                            </div>
                            <MessageStatus message={message} platforms={platforms} />
                          </div>
                        )}
                        <div className={`text-lg leading-relaxed whitespace-pre-wrap font-medium ${
                          message.sender === 'ai' ? 'prose prose-lg max-w-none modern-text-primary' : 'modern-text-primary'
                        }`}>
                          {message.content}
                        </div>
                        <div className={`text-sm mt-4 font-medium flex items-center justify-between ${
                          message.sender === 'user' ? 'modern-text-secondary' : 'modern-text-muted'
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
              );
            })}
            
            {(activeResponders.length > 0) && (
              <div className="flex justify-start">
                <Card className="modern-card-elevated modern-glow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex space-x-2">
                        <div className="w-4 h-4 rounded-full animate-bounce"
                             style={{ backgroundColor: 'hsl(var(--modern-accent-primary))' }}>
                        </div>
                        <div className="w-4 h-4 rounded-full animate-bounce"
                             style={{ 
                               backgroundColor: 'hsl(var(--modern-accent-secondary))',
                               animationDelay: '0.1s'
                             }}>
                        </div>
                        <div className="w-4 h-4 rounded-full animate-bounce"
                             style={{ 
                               backgroundColor: 'hsl(var(--modern-accent-tertiary))',
                               animationDelay: '0.2s'
                             }}>
                        </div>
                      </div>
                      <span className="text-lg modern-text-muted font-medium">
                        Round {roundCount}: {activeResponders.length} AI platform(s) are responding...
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Modern Input Area */}
        <div className="glass-morphism modern-border-t p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-4">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Start a multi-round conversation with AI platforms..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isDiscussionActive}
                className="flex-1 modern-input text-lg py-4"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isDiscussionActive}
                className="modern-btn-primary px-8 py-4 text-lg modern-glow-hover"
              >
                <Send className="w-6 h-6" />
              </Button>
            </div>
            
            <div className="mt-6 text-center">
              <div className="modern-card inline-block px-6 py-3">
                <span className="text-sm modern-text-muted font-medium">
                  {isDiscussionActive 
                    ? `Multi-round discussion active: Round ${roundCount}/${maxRounds} - ${platforms.filter(p => p.enabled && p.hasApiKey).length} AI platform(s) collaborating`
                    : `${platforms.filter(p => p.enabled && p.hasApiKey).length} AI platform(s) ready for multi-round discussion (max ${maxRounds} rounds)`}
                </span>
              </div>
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
