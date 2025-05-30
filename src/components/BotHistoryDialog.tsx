import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open && currentChat && platform) {
      // Scroll to bottom when dialog opens or messages update
      setTimeout(scrollToBottom, 100);
    }
  }, [open, currentChat?.messages, platform]);

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

  const getAgentColor = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return 'agent-openai';
      case 'anthropic':
        return 'agent-anthropic';
      case 'deepseek':
        return 'agent-deepseek';
      default:
        return 'cyber-primary';
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !onSendMessage) return;
    
    onSendMessage(inputMessage, platform.id);
    setInputMessage('');
    
    // Auto-scroll after sending message
    setTimeout(scrollToBottom, 100);
  };

  const botMessages = getBotMessages();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col bg-cyber-surface border-cyber-primary/30">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-cyber-text">
            <span className="text-2xl">{platform?.icon}</span>
            <span className="text-xl font-bold">Chat with {platform?.name}</span>
            <Badge className={`${platform?.color} font-semibold text-base px-3 py-1 cyber-glow`}>
              {platform?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 min-h-0">
            {botMessages.length === 0 ? (
              <div className="text-center text-cyber-muted py-12">
                <div className="text-4xl mb-4">{platform?.icon}</div>
                <p className="text-lg font-medium mb-2">No conversation with {platform?.name} yet.</p>
                <p className="text-base">Start chatting to see the conversation here.</p>
              </div>
            ) : (
              botMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                    <Card className={`border ${
                      message.isUser 
                        ? `bg-${getAgentColor(platform!.id)} text-cyber-bg border-${getAgentColor(platform!.id)} cyber-glow` 
                        : 'bg-cyber-surface/70 border-cyber-primary/30 text-cyber-text'
                    }`}>
                      <CardContent className="p-4">
                        <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${
                          !message.isUser ? 'prose prose-sm max-w-none text-cyber-text' : ''
                        }`}>
                          {message.content}
                        </div>
                        <div className={`text-sm mt-3 font-medium ${
                          message.isUser ? 'text-cyber-bg/70' : 'text-cyber-muted'
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
        <div className="border-t border-cyber-primary/30 pt-4 flex-shrink-0">
          <div className="flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Chat with ${platform?.name}...`}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1 bg-cyber-surface/70 border-cyber-primary/30 focus:border-cyber-primary text-cyber-text placeholder:text-cyber-muted text-base font-medium"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className={`bg-${getAgentColor(platform!.id)} hover:bg-${getAgentColor(platform!.id)}/80 text-cyber-bg font-semibold cyber-glow`}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <div className="text-sm text-cyber-muted mt-3 text-center font-medium">
            This will send a message only to {platform?.name}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotHistoryDialog;
