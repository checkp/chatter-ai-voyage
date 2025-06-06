
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Send, RefreshCw, Square, Play } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  handleStop?: () => void;
  isLoadingResponse: boolean;
  isPending: boolean;
  canStop?: boolean;
  pendingCount?: number;
  isFreeMode?: boolean;
  isFreeModeRunning?: boolean;
  onSendAndStartConversation?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSend,
  handleStop,
  isLoadingResponse,
  isPending,
  canStop = false,
  pendingCount = 0,
  isFreeMode = false,
  isFreeModeRunning = false,
  onSendAndStartConversation
}) => {
  const isDisabled = isLoadingResponse || isPending;

  return (
    <footer className="border-t bg-secondary border-border p-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isDisabled) {
                handleSend();
              }
            }
          }}
          placeholder="Type your message here..."
          className="flex-1 resize-none"
          disabled={isDisabled}
        />
        
        {canStop && handleStop ? (
          <Button 
            onClick={handleStop}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {onSendAndStartConversation && (
              <Button 
                onClick={onSendAndStartConversation}
                disabled={isDisabled || !input.trim() || isFreeModeRunning}
                variant="outline"
                className="flex items-center gap-2"
                title="Send message and start conversation mode"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button 
              onClick={handleSend} 
              disabled={isDisabled || !input.trim()}
            >
              {(isLoadingResponse || isPending) ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        )}
      </div>
      
      {pendingCount > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {pendingCount} AI response{pendingCount !== 1 ? 's' : ''} queued
        </div>
      )}

      {isFreeMode && (
        <div className="mt-2 text-xs text-blue-600 font-medium">
          🤖 Free Mode: Agents are conversing autonomously
        </div>
      )}
    </footer>
  );
};

export default ChatInput;
