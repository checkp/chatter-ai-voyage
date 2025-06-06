
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image, Download, Trash2, Copy } from 'lucide-react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ImageGenerationProps {
  user: SupabaseUser;
}

const ImageGeneration: React.FC<ImageGenerationProps> = ({ user }) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('dall-e-2');
  const [size, setSize] = useState('1024x1024');

  const {
    generatedImages,
    isLoadingImages,
    generateImage,
    isGenerating,
    deleteImage,
    isDeleting,
  } = useImageGeneration(user);

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    generateImage({ prompt, model, size });
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
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const handleCopyUrl = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl);
    toast.success('Image URL copied to clipboard');
  };

  const getTokenCost = (model: string) => {
    switch (model) {
      case 'dall-e-2': return 20;
      case 'dall-e-3': return 40;
      case 'gpt-image-1': return 30;
      default: return 20;
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Generate Images with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dall-e-2">
                    DALL-E 2 
                    <Badge variant="secondary" className="ml-2">20 tokens</Badge>
                  </SelectItem>
                  <SelectItem value="dall-e-3">
                    DALL-E 3 
                    <Badge variant="secondary" className="ml-2">40 tokens</Badge>
                  </SelectItem>
                  <SelectItem value="gpt-image-1">
                    GPT Image 1 
                    <Badge variant="secondary" className="ml-2">30 tokens</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Size</label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                  <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                  <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate ({getTokenCost(model)} tokens)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Images Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Your Generated Images</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingImages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : generatedImages && generatedImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(image.image_url, image.file_name)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopyUrl(image.image_url)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteImage(image.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Image info */}
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{image.model_used}</span>
                      <span>{image.tokens_used} tokens</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No images generated yet</p>
              <p className="text-sm">Create your first AI-generated image above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageGeneration;
