
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, RefreshCw, Square, Play, Sparkles, Paperclip, X } from 'lucide-react';
import ImageModelPicker from '@/components/chat/ImageModelPicker';
import { isImageGenerationIntent } from '@/utils/intentDetection';
import { IMAGE_MODEL_OPTIONS, PROMPT_COLLAB_COST } from '@/config/imageModels';
import type { Attachment } from '@/types/chat';
import { toast } from 'sonner';

const DEFAULT_IMAGE_MODELS = IMAGE_MODEL_OPTIONS.map(m => m.id);
const DEFAULT_IMAGE_COST =
  PROMPT_COLLAB_COST +
  DEFAULT_IMAGE_MODELS.reduce(
    (s, id) => s + (IMAGE_MODEL_OPTIONS.find(m => m.id === id)?.cost ?? 0),
    0
  );

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4 MB per file (base64 inline)
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: (attachments?: Attachment[]) => void;
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
  /** Set false to hide the attach button (e.g. mobile / demo). */
  enableAttachments?: boolean;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

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
  enableAttachments = true,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDisabled = isLoadingResponse || isPending;
  const looksLikeImage = isImageGenerationIntent(input);

  const onSendClick = () => {
    if (looksLikeImage && onGenerateImages) {
      onGenerateImages(input, DEFAULT_IMAGE_MODELS);
      setAttachments([]);
      return;
    }
    handleSend(attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      toast.error(`Max ${MAX_ATTACHMENTS} attachments`);
      return;
    }
    const accepted: Attachment[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: only images are supported`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name}: file > 4 MB`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
        });
      } catch {
        toast.error(`Failed to read ${file.name}`);
      }
    }
    if (accepted.length > 0) setAttachments(prev => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) =>
    setAttachments(prev => prev.filter(a => a.id !== id));

  return (
    <footer className="border-t bg-secondary border-border p-4 flex-shrink-0" data-tour="chat-input">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map(a => (
            <div
              key={a.id}
              className="relative group rounded-md border border-border bg-background overflow-hidden h-16 w-16"
              title={`${a.name} (${Math.round(a.size / 1024)} KB)`}
            >
              <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-90"
                aria-label={`Remove ${a.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isDisabled && (input.trim() || attachments.length > 0)) {
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
            {enableAttachments && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="icon"
                      disabled={isDisabled || attachments.length >= MAX_ATTACHMENTS}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach images (vision-capable agents only · max {MAX_ATTACHMENTS} × 4 MB)</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSendClick}
                  disabled={isDisabled || (!input.trim() && attachments.length === 0)}
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
