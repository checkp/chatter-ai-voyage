import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Square } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AIPlatform, Chat } from '@/types/chat';

interface BotHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: AIPlatform | null;
  currentChat: Chat | null;
  onSendMessage?: (message: string, platformId: string) => void;
}

const BotHistoryDialog: React.FC<BotHistoryDialogProps> = ({
  open,
  onOpenChange,
  platform,
  currentChat,
  onSendMessage
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch messages for the current chat directly
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['messages', currentChat?.id],
    queryFn: async () => {
      if (!currentChat?.id) return [];

      console.log('BotHistoryDialog: Fetching messages for chat:', currentChat.id);
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentChat.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return [];
      }

      const formattedMessages = (messages || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'ai',
        platform: msg.platform,
        created_at: msg.created_at,
        conversation_id: msg.conversation_id,
        timestamp: new Date(msg.created_at)
      }));

      console.log('BotHistoryDialog: Loaded', formattedMessages.length, 'messages for chat', currentChat.id);
      return formattedMessages;
    },
    enabled: !!currentChat?.id && open,
  });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto-scroll when dialog opens, messages change, or platform changes
  useEffect(() => {
    if (open && currentChat && platform) {
      setTimeout(scrollToBottom, 200);
    }
  }, [open, chatMessages?.length, platform]);

  // Auto-scroll when new messages are added
  useEffect(() => {
    if (open && chatMessages) {
      setTimeout(scrollToBottom, 100);
    }
  }, [chatMessages, open]);

  if (!platform || !currentChat) {
    console.log('BotHistoryDialog: Missing required props', { 
      hasPlatform: !!platform, 
      hasCurrentChat: !!currentChat,
      currentChatId: currentChat?.id,
      messagesCount: chatMessages?.length 
    });
    return null;
  }

  // Fixed message filtering logic using the fetched messages
  const getBotMessages = () => {
    console.log('=== getBotMessages DEBUG ===');
    console.log('Platform:', platform.name, 'ID:', platform.id);
    console.log('Current chat ID:', currentChat.id);
    console.log('Fetched messages count:', chatMessages?.length || 0);
    
    // Log first few messages for debugging
    if (chatMessages && chatMessages.length > 0) {
      console.log('Sample messages:', chatMessages.slice(0, 3).map(m => ({
        id: m.id,
        sender: m.sender,
        platform: m.platform,
        content: m.content.substring(0, 50) + '...'
      })));
    }
    
    const conversationMessages: Array<{content: string, timestamp: Date, isUser: boolean, platform?: string}> = [];
    
    if (!chatMessages || chatMessages.length === 0) {
      console.log('No messages found in chat');
      return conversationMessages;
    }
    
    // Sort messages by creation time to maintain chronological order
    const sortedMessages = [...chatMessages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    console.log('Processing', sortedMessages.length, 'sorted messages');
    
    sortedMessages.forEach((message, index) => {
      console.log(`Message ${index + 1}:`, {
        id: message.id,
        sender: message.sender,
        platform: message.platform || 'null',
        content_preview: message.content.substring(0, 30) + '...',
        created_at: message.created_at
      });
      
      // Handle timestamp
      const timestamp = message.timestamp 
        ? (message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp))
        : new Date(message.created_at);
      
      if (message.sender === 'user') {
        // Include ALL user messages in every agent's conversation view
        console.log('✓ Adding user message to conversation');
        conversationMessages.push({
          content: message.content,
          timestamp,
          isUser: true
        });
      } else if (message.sender === 'ai') {
        // Only include AI messages from this specific platform
        console.log('AI message platform check:', message.platform, 'vs target:', platform.id);
        if (message.platform === platform.id) {
          console.log('✓ Adding AI message from', platform.name, 'to conversation');
          conversationMessages.push({
            content: message.content,
            timestamp,
            isUser: false,
            platform: message.platform
          });
        } else {
          console.log('✗ Skipping AI message from different platform:', message.platform);
        }
      }
    });
    
    console.log('Final conversation for', platform.name, ':', conversationMessages.length, 'messages');
    console.log('=== END DEBUG ===');
    return conversationMessages;
  };

  const getAgentColorClasses = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return {
          bg: 'modern-bg-agent-openai',
          text: 'text-white',
          border: 'modern-border-agent-openai'
        };
      case 'anthropic':
        return {
          bg: 'modern-bg-agent-anthropic',
          text: 'text-white', 
          border: 'modern-border-agent-anthropic'
        };
      case 'deepseek':
        return {
          bg: 'modern-bg-agent-deepseek',
          text: 'text-white',
          border: 'modern-border-agent-deepseek'
        };
      case 'grok':
        return {
          bg: 'modern-bg-agent-grok',
          text: 'text-white',
          border: 'modern-border-agent-grok'
        };
      default:
        return {
          bg: 'bg-amber-500',
          text: 'text-white',
          border: 'border-amber-500'
        };
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !onSendMessage || isSending) return;
    
    const messageToSend = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);
    
    try {
      console.log('Sending message from agent dialog:', messageToSend, 'to platform:', platform.id);
      await onSendMessage(messageToSend, platform.id);
      
      // Auto-scroll after sending message
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message from agent dialog:', error);
      // Restore input on error
      setInputMessage(messageToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleStopConversation = () => {
    setInputMessage('');
    onOpenChange(false);
  };

  const botMessages = getBotMessages();
  const agentColors = getAgentColorClasses(platform.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col modern-dialog">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between modern-text-primary">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{platform?.icon}</span>
              <span className="text-xl font-bold">Chat with {platform?.name}</span>
              <Badge className={`${agentColors.bg} font-semibold text-base px-3 py-1 modern-glow ${agentColors.text}`}>
                {platform?.name}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopConversation}
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              End Chat
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4 min-h-0">
            {botMessages.length === 0 ? (
              <div className="text-center modern-text-muted py-12">
                <div className="text-4xl mb-4">{platform?.icon}</div>
                <p className="text-lg font-medium mb-2 modern-text-primary">No conversation with {platform?.name} yet.</p>
                <p className="text-base">Start chatting to see the conversation here.</p>
                <div className="mt-4 text-sm modern-text-muted">
                  <p>Debug info:</p>
                  <p>Current chat ID: {currentChat?.id}</p>
                  <p>Total messages fetched: {chatMessages?.length || 0}</p>
                  <p>Platform ID: {platform?.id}</p>
                  <p>Chat title: {currentChat?.title}</p>
                  {chatMessages && chatMessages.length > 0 && (
                    <div className="mt-2">
                      <p>Message senders: {[...new Set(chatMessages.map(m => m.sender))].join(', ')}</p>
                      <p>Message platforms: {[...new Set(chatMessages.map(m => m.platform).filter(Boolean))].join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              botMessages.map((message, index) => (
                <div
                  key={`${message.timestamp.getTime()}-${index}`}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                    <Card className={`modern-card-elevated transition-all duration-300 hover:shadow-xl modern-glow-hover ${
                      message.isUser 
                        ? `${agentColors.bg} ${agentColors.text} ${agentColors.border} modern-glow` 
                        : 'modern-card modern-text-primary'
                    }`}>
                      <CardContent className="p-4">
                        <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${
                          !message.isUser ? 'prose prose-sm max-w-none modern-text-primary' : ''
                        }`}>
                          {message.content}
                        </div>
                        <div className={`text-sm mt-3 font-medium ${
                          message.isUser ? 'text-white/70' : 'modern-text-muted'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                          {message.platform && !message.isUser && (
                            <span className="ml-2 opacity-75">• {platform?.name}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="modern-border-t pt-4 flex-shrink-0">
          <div className="flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Chat with ${platform?.name}...`}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isSending}
              className="flex-1 modern-input"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className={`${agentColors.bg} hover:opacity-80 ${agentColors.text} font-semibold modern-glow`}
            >
              {isSending ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <div className="text-sm modern-text-muted mt-3 text-center font-medium">
            This will send a message only to {platform?.name}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotHistoryDialog;
