
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image, Download, Trash2, Copy, X, Sparkles, Zap, Clock, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

interface ImageGenerationProps {
  user: SupabaseUser;
}

const ENGINES = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    models: [
      { id: 'dall-e-3', name: 'DALL-E 3', tokens: 40, speed: 'medium', quality: 'High' },
      { id: 'gpt-image-1', name: 'GPT Image 1', tokens: 30, speed: 'medium', quality: 'High' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '🔵',
    models: [
      { id: 'gemini-image', name: 'Gemini Flash Image', tokens: 15, speed: 'fast', quality: 'Good' },
      { id: 'gemini-pro-image', name: 'Gemini Pro Image', tokens: 35, speed: 'slow', quality: 'Premium' },
    ],
  },
  {
    id: 'grok',
    name: 'Grok',
    icon: '🟣',
    models: [
      { id: 'grok-aurora', name: 'Aurora', tokens: 25, speed: 'fast', quality: 'High' },
    ],
  },
];

const STYLE_PRESETS = [
  'Photorealistic', 'Digital Art', 'Anime', 'Oil Painting', '3D Render', 'Watercolor',
];

const ASPECT_RATIOS: { id: string; label: string; icon: React.ReactNode; sizes: Record<string, string> }[] = [
  {
    id: 'square',
    label: 'Square',
    icon: <Square className="w-4 h-4" />,
    sizes: { openai: '1024x1024', gemini: '1024x1024', grok: '1024x1024' },
  },
  {
    id: 'landscape',
    label: 'Landscape',
    icon: <RectangleHorizontal className="w-4 h-4" />,
    sizes: { openai: '1792x1024', gemini: '1536x1024', grok: '1536x1024' },
  },
  {
    id: 'portrait',
    label: 'Portrait',
    icon: <RectangleVertical className="w-4 h-4" />,
    sizes: { openai: '1024x1792', gemini: '1024x1536', grok: '1024x1536' },
  },
];

const ImageGeneration: React.FC<ImageGenerationProps> = ({ user }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('openai');
  const [selectedModelId, setSelectedModelId] = useState('dall-e-3');
  const [aspectRatio, setAspectRatio] = useState('square');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; prompt: string } | null>(null);

  const {
    generatedImages,
    isLoadingImages,
    generateImage,
    isGenerating,
    deleteImage,
    isDeleting,
  } = useImageGeneration(user);

  const engine = ENGINES.find(e => e.id === selectedEngine)!;
  const model = engine.models.find(m => m.id === selectedModelId) || engine.models[0];
  const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio)!;
  const size = ratio.sizes[selectedEngine];

  const handleEngineChange = (engineId: string) => {
    setSelectedEngine(engineId);
    const eng = ENGINES.find(e => e.id === engineId)!;
    setSelectedModelId(eng.models[0].id);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    const fullPrompt = selectedStyle ? `${prompt}, ${selectedStyle.toLowerCase()} style` : prompt;
    generateImage({ prompt: fullPrompt, model: selectedModelId, size });
    setPrompt('');
  };

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'generated-image.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const speedIcon = (speed: string) => {
    if (speed === 'fast') return <Zap className="w-3 h-3 text-yellow-500" />;
    if (speed === 'slow') return <Clock className="w-3 h-3 text-muted-foreground" />;
    return <Sparkles className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Engine Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ENGINES.map((eng) => (
          <button
            key={eng.id}
            onClick={() => handleEngineChange(eng.id)}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
              selectedEngine === eng.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{eng.icon}</span>
              <span className="font-semibold text-foreground">{eng.name}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {eng.models.map((m) => (
                <Badge
                  key={m.id}
                  variant={selectedModelId === m.id && selectedEngine === eng.id ? 'default' : 'secondary'}
                  className="cursor-pointer text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEngine(eng.id);
                    setSelectedModelId(m.id);
                  }}
                >
                  {m.name}
                </Badge>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Model Info */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {speedIcon(model.speed)}
          <span className="capitalize">{model.speed}</span>
        </div>
        <Badge variant="outline">{model.quality} quality</Badge>
        <Badge variant="secondary">{model.tokens} tokens</Badge>
      </div>

      {/* Prompt + Controls */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Textarea
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            className="min-h-[100px] resize-none text-base"
          />

          {/* Style Presets */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Style (optional)</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(selectedStyle === style ? null : style)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    selectedStyle === style
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio + Generate */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Aspect Ratio</p>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setAspectRatio(r.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                      aspectRatio === r.id
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {r.icon}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              size="lg"
              className="min-w-[180px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate ({model.tokens} tokens)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Generated Images</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingImages ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : generatedImages && generatedImages.length > 0 ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {generatedImages.map((image) => (
                <div
                  key={image.id}
                  className="break-inside-avoid group relative rounded-xl overflow-hidden border border-border bg-muted cursor-pointer"
                  onClick={() => setLightboxImage({ url: image.image_url, prompt: image.prompt })}
                >
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full object-cover transition-transform group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-xs line-clamp-2 mb-2">{image.prompt}</p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); handleDownload(image.image_url, image.file_name); }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(image.image_url); toast.success('URL copied'); }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 w-7 p-0"
                        disabled={isDeleting}
                        onClick={(e) => { e.stopPropagation(); deleteImage(image.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <div className="ml-auto flex items-center gap-1 text-white/70 text-[10px]">
                        <span>{image.model_used}</span>
                        <span>·</span>
                        <span>{image.tokens_used}t</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No images generated yet</p>
              <p className="text-sm mt-1">Create your first AI-generated image above!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.prompt}
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
            <p className="text-white/80 text-sm mt-3 text-center max-w-xl mx-auto">{lightboxImage.prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGeneration;
