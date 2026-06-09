
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, RefreshCw, Square, Play, Sparkles } from 'lucide-react';
import ImageModelPicker from '@/components/chat/ImageModelPicker';
import { isImageGenerationIntent } from '@/utils/intentDetection';
import { IMAGE_MODEL_OPTIONS, PROMPT_COLLAB_COST } from '@/config/imageModels';

const DEFAULT_IMAGE_MODELS = IMAGE_MODEL_OPTIONS.map(m => m.id);
const DEFAULT_IMAGE_COST =
  PROMPT_COLLAB_COST +
  DEFAULT_IMAGE_MODELS.reduce(
    (s, id) => s + (IMAGE_MODEL_OPTIONS.find(m => m.id === id)?.cost ?? 0),
    0
  );

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
  onGenerateImages?: (prompt: string, models: string[]) => void;
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
  placeholder = "Type your message here...",
  onGenerateImages,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isDisabled = isLoadingResponse || isPending;
  const looksLikeImage = isImageGenerationIntent(input);

  const onSendClick = () => {
    if (looksLikeImage && onGenerateImages) {
      onGenerateImages(input, DEFAULT_IMAGE_MODELS);
      return;
    }
    handleSend();
  };


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
                onSendClick();
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
                  onClick={onSendClick} 
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
            
            {onGenerateImages && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setPickerOpen(true)}
                    variant={looksLikeImage ? 'default' : 'outline'}
                    size="icon"
                    className={looksLikeImage ? 'animate-pulse' : ''}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{looksLikeImage ? '🎨 Image request detected — fan out to all models' : 'Generate images with multiple AIs'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {looksLikeImage && onGenerateImages && (
        <div className="mt-1 text-[8pt] leading-none text-muted-foreground/70 text-right pr-1">
          ~{DEFAULT_IMAGE_COST}t · image gen
        </div>
      )}
      
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

      {onGenerateImages && (
        <ImageModelPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          userPrompt={input}
          onConfirm={(models) => {
            onGenerateImages(input, models);
            setInput('');
          }}
        />
      )}
    </footer>
  );
};

export default ChatInput;
