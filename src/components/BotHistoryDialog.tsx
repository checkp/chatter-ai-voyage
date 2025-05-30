
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  // Extract messages relevant to this platform
  const getBotMessages = () => {
    const botMessages: Array<{content: string, timestamp: Date, isUser: boolean}> = [];
    
    currentChat.messages.forEach(message => {
      if (message.sender === 'user') {
        botMessages.push({
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
            botMessages.push({
              content: botResponse,
              timestamp: message.timestamp,
              isUser: false
            });
          }
        }
      }
    });
    
    return botMessages;
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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{platform.icon}</span>
            <span>Chat with {platform.name}</span>
            <Badge className={platform.color}>{platform.name}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[50vh] p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {botMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No conversation with {platform.name} yet.</p>
                <p className="text-sm mt-2">Start chatting to see the conversation here.</p>
              </div>
            ) : (
              botMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                    <Card className={`${
                      message.isUser 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                        : 'bg-white shadow-sm border'
                    }`}>
                      <CardContent className="p-3">
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                          !message.isUser ? 'prose prose-sm max-w-none' : ''
                        }`}>
                          {message.content}
                        </div>
                        <div className={`text-xs mt-2 ${
                          message.isUser ? 'text-blue-100' : 'text-gray-500'
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
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Chat with ${platform.name}...`}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            This will send a message only to {platform.name}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotHistoryDialog;
