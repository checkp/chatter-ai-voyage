
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Square } from 'lucide-react';

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
}

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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto-scroll when dialog opens, messages change, or platform changes
  useEffect(() => {
    if (open && currentChat && platform) {
      // Use a longer timeout to ensure the dialog has fully rendered
      setTimeout(scrollToBottom, 200);
    }
  }, [open, currentChat?.messages?.length, platform]);

  // Auto-scroll when new messages are added
  useEffect(() => {
    if (open && currentChat?.messages) {
      setTimeout(scrollToBottom, 100);
    }
  }, [currentChat?.messages, open]);

  if (!platform || !currentChat) return null;

  // Extract messages relevant to this platform with the new structure
  const getBotMessages = () => {
    console.log('getBotMessages called for platform:', platform.name);
    console.log('Total messages in chat:', currentChat.messages.length);
    
    const botMessages: Array<{content: string, timestamp: Date, isUser: boolean}> = [];
    
    currentChat.messages.forEach((message, index) => {
      console.log(`Message ${index}:`, { 
        sender: message.sender, 
        platform: message.platform, 
        content: message.content.substring(0, 100) + '...'
      });
      
      if (message.sender === 'user') {
        botMessages.push({
          content: message.content,
          timestamp: message.timestamp,
          isUser: true
        });
      } else if (message.sender === 'ai' && message.platform === platform.id) {
        // This is a platform-specific message
        console.log('Found platform-specific message for', platform.name);
        botMessages.push({
          content: message.content,
          timestamp: message.timestamp,
          isUser: false
        });
      }
    });
    
    console.log('Final bot messages for', platform.name, ':', botMessages.length);
    return botMessages;
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
    
    setIsSending(true);
    try {
      await onSendMessage(inputMessage, platform.id);
      setInputMessage('');
      
      // Auto-scroll after sending message
      setTimeout(scrollToBottom, 100);
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
              </div>
            ) : (
              botMessages.map((message, index) => (
                <div
                  key={index}
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
