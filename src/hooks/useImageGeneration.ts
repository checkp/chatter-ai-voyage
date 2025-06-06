
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface GenerateImageParams {
  prompt: string;
  model?: string;
  size?: string;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  file_name: string;
  tokens_used: number;
  model_used: string;
  size: string;
  created_at: string;
}

export const useImageGeneration = (user: SupabaseUser | null) => {
  const queryClient = useQueryClient();

  // Fetch user's generated images
  const { data: generatedImages, isLoading: isLoadingImages } = useQuery({
    queryKey: ['generated-images', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching generated images:', error);
        return [];
      }

      return data as GeneratedImage[];
    },
    enabled: !!user,
  });

  // Generate image mutation
  const generateImageMutation = useMutation({
    mutationFn: async (params: GenerateImageParams) => {
      if (!user) throw new Error('User not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await supabase.functions.invoke('generate-image', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate image');
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Image generated successfully! Used ${data.tokensUsed} tokens.`);
      queryClient.invalidateQueries({ queryKey: ['generated-images', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tokens', user?.id] });
    },
    onError: (error: any) => {
      console.error('Image generation error:', error);
      if (error.message.includes('Insufficient tokens')) {
        toast.error('Insufficient tokens for image generation');
      } else {
        toast.error(error.message || 'Failed to generate image');
      }
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Image deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['generated-images', user?.id] });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
    },
  });

  return {
    generatedImages,
    isLoadingImages,
    generateImage: generateImageMutation.mutate,
    isGenerating: generateImageMutation.isPending,
    deleteImage: deleteImageMutation.mutate,
    isDeleting: deleteImageMutation.isPending,
  };
};
