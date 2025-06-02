
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
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
    queryKey: ['chat-messages', currentChat?.id],
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

  // Updated message filtering logic to show only relevant messages for this agent
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
        // For user messages, show:
        // 1. Messages with platform=null (general chat messages - visible to all agents)
        // 2. Messages with platform matching this agent (private messages to this agent)
        if (message.platform === null || message.platform === platform.id) {
          console.log('✓ Adding user message to conversation (general or private to this agent)');
          conversationMessages.push({
            content: message.content,
            timestamp,
            isUser: true
          });
        } else {
          console.log('✗ Skipping user message private to another agent:', message.platform);
        }
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
          bg: 'bg-agent-openai',
          text: 'text-white',
          border: 'border-agent-openai'
        };
      case 'anthropic':
        return {
          bg: 'bg-agent-anthropic',
          text: 'text-white', 
          border: 'border-agent-anthropic'
        };
      case 'deepseek':
        return {
          bg: 'bg-agent-deepseek',
          text: 'text-white',
          border: 'border-agent-deepseek'
        };
      case 'grok':
        return {
          bg: 'bg-agent-grok',
          text: 'text-white',
          border: 'border-agent-grok'
        };
      default:
        return {
          bg: 'bg-primary',
          text: 'text-primary-foreground',
          border: 'border-primary'
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

  const botMessages = getBotMessages();
  const agentColors = getAgentColorClasses(platform.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col bg-background border border-border rounded-2xl shadow-2xl font-inter">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <span className="text-2xl">{platform?.icon}</span>
            <span className="text-xl font-bold">Chat with {platform?.name}</span>
            <Badge className={`${agentColors.bg} font-semibold text-base px-3 py-1 ${agentColors.text} rounded-full`}>
              {platform?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4 min-h-0">
            {botMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-4">{platform?.icon}</div>
                <p className="text-lg font-medium mb-2 text-foreground">No conversation with {platform?.name} yet.</p>
                <p className="text-base text-muted-foreground">Start chatting to see the conversation here.</p>
              </div>
            ) : (
              botMessages.map((message, index) => (
                <div
                  key={`${message.timestamp.getTime()}-${index}`}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                    <Card className={`transition-all duration-300 hover:shadow-lg rounded-xl overflow-hidden ${
                      message.isUser 
                        ? 'bg-primary text-primary-foreground border-none shadow-md' 
                        : 'bg-card border border-border shadow-sm'
                    }`}>
                      <CardContent className="p-4">
                        <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${
                          message.isUser 
                            ? 'text-primary-foreground' 
                            : 'text-card-foreground'
                        }`}>
                          {message.content}
                        </div>
                        <div className={`text-sm mt-3 font-medium ${
                          message.isUser 
                            ? 'text-primary-foreground/80' 
                            : 'text-muted-foreground'
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
        <div className="border-t border-border pt-4 flex-shrink-0">
          <div className="flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Chat privately with ${platform?.name}...`}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isSending}
              className="flex-1 border-border bg-background text-foreground rounded-xl px-4 py-3 font-medium"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className={`${agentColors.bg} hover:opacity-80 ${agentColors.text} font-semibold rounded-xl px-6 shadow-md`}
            >
              {isSending ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground mt-3 text-center font-medium">
            This will send a private message only to {platform?.name}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotHistoryDialog;
