
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from '@/components/ui/progress';
import {
  Send, RefreshCw, Square, Play, Sparkles, Paperclip, X,
  FileText, FileAudio, FileVideo, File as FileIcon, Image as ImageIcon,
} from 'lucide-react';
import ImageModelPicker from '@/components/chat/ImageModelPicker';
import CapabilityToggles from '@/components/chat/CapabilityToggles';
import { isImageGenerationIntent } from '@/utils/intentDetection';
import { IMAGE_MODEL_OPTIONS, PROMPT_COLLAB_COST } from '@/config/imageModels';
import { setPendingCapabilities, type Capabilities } from '@/lib/capabilities';
import type { Attachment } from '@/types/chat';
import { toast } from 'sonner';

const DEFAULT_IMAGE_MODELS = IMAGE_MODEL_OPTIONS.map(m => m.id);
const DEFAULT_IMAGE_COST =
  PROMPT_COLLAB_COST +
  DEFAULT_IMAGE_MODELS.reduce(
    (s, id) => s + (IMAGE_MODEL_OPTIONS.find(m => m.id === id)?.cost ?? 0),
    0
  );

const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB per file
const ACCEPTED_TYPES = '*/*';

// Files we can inline as plain text into the prompt (cross-provider safe).
const TEXTUAL_EXT = /\.(txt|md|markdown|csv|tsv|json|ya?ml|xml|html?|css|scss|js|jsx|ts|tsx|py|rb|go|rs|java|c|cc|cpp|h|hpp|sh|bash|zsh|sql|toml|ini|env|log|svg)$/i;
const isTextual = (file: File) =>
  file.type.startsWith('text/') ||
  /json|xml|yaml|javascript|typescript|sql|csv/.test(file.type) ||
  TEXTUAL_EXT.test(file.name);

interface UploadItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  progress: number; // 0..100
  error?: string;
}

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
  enableAttachments?: boolean;
}

const readFile = (
  file: File,
  mode: 'dataUrl' | 'text',
  onProgress: (pct: number) => void,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    reader.onload = () => {
      onProgress(100);
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    if (mode === 'text') reader.readAsText(file);
    else reader.readAsDataURL(file);
  });

const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;

const iconFor = (mime: string) => {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('audio/')) return FileAudio;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime === 'application/pdf' || mime.startsWith('text/')) return FileText;
  return FileIcon;
};

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
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [capabilities, setCapabilities] = useState<Capabilities>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDisabled = isLoadingResponse || isPending;
  const looksLikeImage = isImageGenerationIntent(input);

  // External sources (e.g. reMarkable notes) can push context into the composer.
  useEffect(() => {
    const onInsert = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === 'string' && text) setInput(input ? `${input}\n\n${text}` : text);
    };
    window.addEventListener('roboheard:insert-text', onInsert);
    return () => window.removeEventListener('roboheard:insert-text', onInsert);
  }, [input, setInput]);


  const onSendClick = () => {
    // Push per-message capability overrides into the shared registry; one-shot
    // by default so they don't leak into the next message.
    setPendingCapabilities(capabilities);

    // Inline text-file contents so every provider sees them.
    const textInlines = attachments
      .filter(a => (a as any).textContent)
      .map(a => `\n\n--- attached file: ${a.name} ---\n${(a as any).textContent}\n--- end ${a.name} ---`)
      .join('');
    const finalText = input + textInlines;

    if (looksLikeImage && onGenerateImages) {
      onGenerateImages(finalText, DEFAULT_IMAGE_MODELS);
      setAttachments([]);
      setCapabilities({});
      return;
    }
    if (textInlines) setInput(finalText);
    handleSend(attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
    setCapabilities({});
  };

  const ingestFiles = useCallback(async (fileList: File[]) => {
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      toast.error(`Attachment limit reached (max ${MAX_ATTACHMENTS})`);
      return;
    }
    const batch = fileList.slice(0, remaining);
    if (fileList.length > remaining) {
      toast.warning(`Only the first ${remaining} file${remaining === 1 ? '' : 's'} will be attached (max ${MAX_ATTACHMENTS}).`);
    }

    let success = 0;
    let failed = 0;

    await Promise.all(batch.map(async (file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const mime = file.type || 'application/octet-stream';

      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name} is too large (${fmtSize(file.size)}). Limit is ${fmtSize(MAX_ATTACHMENT_BYTES)}.`);
        failed++;
        return;
      }

      setUploads(prev => [...prev, { id, name: file.name, size: file.size, mimeType: mime, progress: 0 }]);
      const updateProgress = (pct: number) =>
        setUploads(prev => prev.map(u => (u.id === id ? { ...u, progress: pct } : u)));

      try {
        const useText = isTextual(file);
        const result = await readFile(file, useText ? 'text' : 'dataUrl', updateProgress);

        const att: Attachment & { textContent?: string } = {
          id,
          name: file.name,
          mimeType: mime,
          size: file.size,
          dataUrl: useText
            ? `data:${mime || 'text/plain'};base64,${btoa(unescape(encodeURIComponent(result as string)))}`
            : (result as string),
        };
        if (useText) att.textContent = result as string;

        setAttachments(prev => [...prev, att]);
        success++;

        // Warn about formats not yet understood by AI providers.
        if (!useText && !mime.startsWith('image/') && mime !== 'application/pdf') {
          toast.warning(`${file.name} attached, but most agents only read images, PDFs, and text.`);
        }
      } catch (e) {
        console.error('upload error', e);
        setUploads(prev => prev.map(u => (u.id === id ? { ...u, error: 'Failed to read' } : u)));
        toast.error(`Failed to read ${file.name}`);
        failed++;
      } finally {
        // Remove progress entry after short delay so the bar can finish.
        setTimeout(() => setUploads(prev => prev.filter(u => u.id !== id)), 400);
      }
    }));

    if (success > 0) {
      toast.success(`${success} file${success === 1 ? '' : 's'} attached${failed ? ` · ${failed} failed` : ''}`);
    }
  }, [attachments.length]);

  const onPickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void ingestFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) =>
    setAttachments(prev => prev.filter(a => a.id !== id));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!enableAttachments || isDisabled) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) void ingestFiles(files);
  };

  return (
    <footer
      className={`border-t bg-secondary border-border p-4 flex-shrink-0 transition-colors ${dragOver ? 'bg-primary/5 ring-2 ring-primary/40' : ''}`}
      data-tour="chat-input"
      onDragOver={(e) => { if (enableAttachments) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {(attachments.length > 0 || uploads.length > 0) && (
        <div className="mb-2 space-y-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map(a => {
                const Icon = iconFor(a.mimeType);
                const isImg = a.mimeType.startsWith('image/');
                return (
                  <div
                    key={a.id}
                    className="relative group rounded-md border border-border bg-background overflow-hidden"
                    title={`${a.name} · ${fmtSize(a.size)}`}
                  >
                    {isImg ? (
                      <div className="h-16 w-16">
                        <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2 py-2 max-w-[220px] h-16">
                        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{a.name}</div>
                          <div className="text-[10px] text-muted-foreground">{fmtSize(a.size)}</div>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-90"
                      aria-label={`Remove ${a.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {uploads.length > 0 && (
            <div className="space-y-1">
              {uploads.map(u => (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  <span className="truncate max-w-[200px]">{u.name}</span>
                  <Progress value={u.progress} className="h-1 flex-1" />
                  <span className={`tabular-nums ${u.error ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {u.error ? u.error : `${u.progress}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <CapabilityToggles value={capabilities} onChange={setCapabilities} disabled={isDisabled} />
      </div>

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
          placeholder={dragOver ? 'Drop files to attach…' : placeholder}
          className="flex-1 resize-none"
          disabled={isDisabled}
        />

        {canStop && handleStop ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleStop} variant="destructive" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Stop AI conversation</p></TooltipContent>
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
                    <p>Attach files · any format · max {MAX_ATTACHMENTS} × {fmtSize(MAX_ATTACHMENT_BYTES)}<br />Images & PDFs → vision agents. Text files inlined. Drag & drop supported.</p>
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
              <TooltipContent><p>Send message</p></TooltipContent>
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
                <TooltipContent><p>Send and start conversation</p></TooltipContent>
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
