
import React, { useState, useEffect, useRef } from 'react';
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
  const [botMessages, setBotMessages] = useState<Array<{content: string, timestamp: Date, isUser: boolean}>>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  if (!platform || !currentChat) return null;

  // Extract messages relevant to this platform
  const getBotMessages = () => {
    const messages: Array<{content: string, timestamp: Date, isUser: boolean}> = [];
    
    currentChat.messages.forEach(message => {
      if (message.sender === 'user') {
        messages.push({
          content: message.content,
          timestamp: message.timestamp,
          isUser: true
        });
      } else if (message.sender === 'ai') {
        // Parse consolidated message to extract this bot's response
        const content = message.content;
        const botIcon = platform.icon;
        const botName = platform.name;
        
        // Look for this bot's section in the consolidated message
        const botPattern = new RegExp(`\\*\\*${botIcon}\\s+${botName}:\\*\\*\\s*\\n\\n([\\s\\S]*?)(?=\\n\\n---\\n\\n|$)`, 'i');
        const match = content.match(botPattern);
        
        if (match) {
          const botResponse = match[1].trim();
          if (botResponse && !botResponse.startsWith('❌ Error:')) {
            messages.push({
              content: botResponse,
              timestamp: message.timestamp,
              isUser: false
            });
          }
        }
      }
    });
    
    return messages;
  };

  // Update messages when chat changes and scroll to bottom
  useEffect(() => {
    const messages = getBotMessages();
    setBotMessages(messages);
    
    // Scroll to bottom after messages update
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
  }, [currentChat, platform]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !onSendMessage) return;
    
    onSendMessage(inputMessage, platform.id);
    setInputMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col bg-cyber-bg border-cyber-primary font-orbitron">
        <DialogHeader className="bg-gradient-to-r from-cyber-surface to-cyber-accent p-6 -m-6 mb-4">
          <DialogTitle className="flex items-center gap-3 text-cyber-text text-xl">
            <span className="text-2xl animate-glow-pulse">{platform.icon}</span>
            <span className="font-bold">Chat with {platform.name}</span>
            <Badge className="bg-cyber-primary text-cyber-bg font-bold px-3 py-1 text-sm">
              {platform.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 max-h-[55vh] p-2 bg-cyber-surface/30 rounded-lg border border-cyber-primary/30"
        >
          <div className="space-y-6 p-4">
            {botMessages.length === 0 ? (
              <div className="text-center text-cyber-text-dim py-12">
                <div className="text-6xl mb-4 animate-glow-pulse">{platform.icon}</div>
                <p className="text-lg font-bold text-cyber-primary">No conversation with {platform.name} yet.</p>
                <p className="text-base mt-2 text-cyber-text-dim">Start chatting to see the conversation here.</p>
              </div>
            ) : (
              botMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                    <Card className={`${
                      message.isUser 
                        ? 'bg-gradient-to-r from-cyber-primary to-cyber-secondary text-cyber-bg border-cyber-primary shadow-lg shadow-cyber-primary/20' 
                        : 'bg-cyber-surface border-cyber-accent shadow-lg shadow-cyber-accent/10'
                    }`}>
                      <CardContent className="p-5">
                        <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium ${
                          !message.isUser ? 'prose prose-sm max-w-none text-cyber-text' : 'text-cyber-bg'
                        }`}>
                          {message.content}
                        </div>
                        <div className={`text-sm mt-3 font-mono ${
                          message.isUser ? 'text-cyber-bg/80' : 'text-cyber-text-dim'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-cyber-primary/30 pt-6 bg-cyber-surface/20 -mx-6 px-6 -mb-6 pb-6">
          <div className="flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Chat with ${platform.name}...`}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1 bg-cyber-accent border-cyber-primary text-cyber-text text-base p-4 font-orbitron placeholder:text-cyber-text-dim focus:ring-cyber-primary focus:border-cyber-primary focus:shadow-lg focus:shadow-cyber-primary/20"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="bg-gradient-to-r from-cyber-primary to-cyber-secondary hover:from-cyber-secondary hover:to-cyber-primary text-cyber-bg font-bold px-6 py-4 shadow-lg shadow-cyber-primary/30 hover:shadow-cyber-secondary/30 transition-all duration-300 animate-glow-pulse"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <div className="text-sm text-cyber-text-dim mt-3 text-center font-mono">
            This will send a message only to <span className="text-cyber-primary font-bold">{platform.name}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotHistoryDialog;
