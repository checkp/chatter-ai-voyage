import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ImagePanelData } from '@/config/imageModels';

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

      const { data, error } = await supabase.functions.invoke('multi-image-generate', {
        body: { userPrompt, models },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const msg = (error as any).context?.error ?? error.message ?? 'Image generation failed';
        toast.error(msg);
        return null;
      }
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      const successful = data.images.filter((i: any) => i.success).length;
      toast.success(`Generated ${successful}/${data.images.length} images · ${data.tokensUsed}t`);

      return {
        userPrompt,
        masterPrompt: data.masterPrompt,
        proposals: data.proposals,
        images: data.images,
      };
    } catch (e: any) {
      console.error('multi-image generation error:', e);
      toast.error(e?.message || 'Image generation failed');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isGenerating };
};
