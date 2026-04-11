
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, RefreshCw, Square, Play, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  placeholder?: string;
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
  onSendAndStartConversation,
  placeholder = "Type your message here..."
}) => {
  const navigate = useNavigate();
  const isDisabled = isLoadingResponse || isPending;

  return (
    <footer className="border-t bg-secondary border-border p-4 flex-shrink-0" data-tour="chat-input">
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
          placeholder={placeholder}
          className="flex-1 resize-none"
          disabled={isDisabled}
        />
        
        {canStop && handleStop ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleStop}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop AI conversation</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSend} 
                  disabled={isDisabled || !input.trim()}
                  size="icon"
                >
                  {(isLoadingResponse || isPending) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send message</p>
              </TooltipContent>
            </Tooltip>
            
            {onSendAndStartConversation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onSendAndStartConversation}
                    disabled={isDisabled || !input.trim() || isFreeModeRunning}
                    variant="outline"
                    size="icon"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send and start conversation</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => navigate('/images')}
                  variant="outline"
                  size="icon"
                >
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate AI Images</p>
              </TooltipContent>
            </Tooltip>
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
