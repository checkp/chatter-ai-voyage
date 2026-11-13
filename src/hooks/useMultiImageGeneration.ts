import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ImagePanelData } from '@/config/imageModels';

/** Response body of the multi-image-generate edge function. */
interface MultiImageResponse {
  error?: string;
  masterPrompt: string;
  proposals: ImagePanelData['proposals'];
  images: ImagePanelData['images'];
  tokensUsed: number;
}

/** Reads `context.error` from a Supabase functions error, when the server provided one. */
const getContextErrorMessage = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('context' in err)) return undefined;
  const ctx = err.context;
  if (typeof ctx !== 'object' || ctx === null || !('error' in ctx)) return undefined;
  return typeof ctx.error === 'string' ? ctx.error : undefined;
};

export const useMultiImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async (userPrompt: string, models: string[]): Promise<ImagePanelData | null> => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return null;
      }

      const { data, error } = await supabase.functions.invoke<MultiImageResponse>('multi-image-generate', {
        body: { userPrompt, models },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const msg = getContextErrorMessage(error) ?? error.message ?? 'Image generation failed';
        toast.error(msg);
        return null;
      }
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      if (!data) throw new Error('Image generation failed');

      const successful = data.images.filter((i) => i.success).length;
      toast.success(`Generated ${successful}/${data.images.length} images · ${data.tokensUsed}t`);

      return {
        userPrompt,
        masterPrompt: data.masterPrompt,
        proposals: data.proposals,
        images: data.images,
      };
    } catch (e) {
      console.error('multi-image generation error:', e);
      const message = e instanceof Error ? e.message : undefined;
      toast.error(message || 'Image generation failed');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isGenerating };
};
