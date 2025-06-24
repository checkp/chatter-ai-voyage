
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Crown, Send, Loader2 } from 'lucide-react';
import type { Message, AIPlatform } from '@/types/chat';

interface ConductorChatProps {
  conductorPlatform: AIPlatform | null;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

const ConductorChat: React.FC<ConductorChatProps> = ({
  conductorPlatform,
  messages,
  isLoading,
  onSendMessage
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conductorPlatform) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <Crown className="h-16 w-16 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">No Conductor Selected</h3>
          <p className="text-muted-foreground">Please select a conductor AI in the chat settings to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Crown className="h-5 w-5 text-amber-500" />
        <div className="flex items-center gap-2">
          <span className="text-lg">{conductorPlatform.icon}</span>
          <span className="font-semibold">{conductorPlatform.name}</span>
        </div>
        <Badge variant="secondary" className="ml-auto">
          Conductor
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Start a conversation with your conductor</p>
              <p className="text-sm mt-1">The conductor will coordinate with other AIs as needed</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <span className="text-lg">{conductorPlatform.icon}</span>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Conductor is thinking...</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your conductor anything..."
            className="flex-1 min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConductorChat;
