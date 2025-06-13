
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, Brain, Search, Zap, Gem } from 'lucide-react';
import type { AIPlatform, Chat, Message } from '@/types/chat';

interface BotHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: AIPlatform | null;
  currentChat?: Chat | null;
  onSendMessage?: (message: string, platformId: string) => void;
}

const BotHistoryDialog: React.FC<BotHistoryDialogProps> = ({
  open,
  onOpenChange,
  platform,
  currentChat,
  onSendMessage
}) => {
  const [message, setMessage] = useState('');

  // Reset message when dialog closes
  useEffect(() => {
    if (!open) {
      setMessage('');
    }
  }, [open]);

  if (!platform) return null;

  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return Bot;
      case 'anthropic':
        return Brain;
      case 'deepseek':
        return Search;
      case 'grok':
        return Zap;
      case 'google':
        return Gem;
      default:
        return Bot;
    }
  };

  // Get all messages and create a chronological conversation
  const allMessages = currentChat?.messages || [];
  
  // Create a chronological conversation including user messages and this platform's responses
  const conversationMessages: Message[] = [];
  const seenMessageIds = new Set<string>();
  
  // Sort messages by creation time to ensure chronological order
  const sortedMessages = [...allMessages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  sortedMessages.forEach(msg => {
    // Avoid duplicates
    if (seenMessageIds.has(msg.id)) {
      return;
    }
    
    // Include user messages (everyone sees these)
    if (msg.sender === 'user') {
      conversationMessages.push(msg);
      seenMessageIds.add(msg.id);
    }
    // Include only THIS platform's AI responses
    else if (msg.sender === 'ai' && msg.platform === platform.id) {
      conversationMessages.push(msg);
      seenMessageIds.add(msg.id);
    }
  });

  const handleSendMessage = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim(), platform.id);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const Icon = getPlatformIcon(platform.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modern-dialog max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="modern-text-primary flex items-center gap-2">
            <Icon className="w-5 h-5" />
            Chat with {platform.name}
            <Badge variant="outline" className="ml-2">
              {conversationMessages.filter(m => m.sender === 'ai' && m.platform === platform.id).length} responses
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          <ScrollArea className="flex-1 modern-bg-surface rounded-lg p-4">
            {conversationMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full modern-text-muted">
                <div className="text-center">
                  <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No conversation history with {platform.name}</p>
                  <p className="text-sm mt-2">Start a conversation below</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender === 'user'
                          ? 'modern-btn-primary text-right'
                          : 'modern-bg-surface modern-border border modern-text-primary'
                      }`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{platform.name}</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp || msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Send a message to ${platform.name}...`}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotHistoryDialog;
