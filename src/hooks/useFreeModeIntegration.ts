
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Message, AIPlatform, ChatMode } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export const useFreeModeIntegration = (
  user: SupabaseUser | null,
  activeChatId: string | null,
  platforms: AIPlatform[],
  messages: Message[] | undefined,
  activeChatMode: ChatMode,
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[], chatMode?: ChatMode) => Promise<string>
) => {
  // Mutation for adding messages to the database
  const addMessageMutation = useMutation({
    mutationFn: async ({ content, role, platformId }: { content: string; role: 'user' | 'assistant'; platformId?: string }) => {
      if (!user || !activeChatId) throw new Error('No user or chat');
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChatId,
          content,
          role,
          platform_id: platformId,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Send single agent message function for free mode
  const sendSingleAgentMessage = async (message: string, platformId: string) => {
    if (!user || !activeChatId) {
      console.error('No user or active chat for free mode message');
      return;
    }
    
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) {
        console.error(`Platform not found: ${platformId}`);
        return;
      }
      
      console.log(`Free mode: Sending message with ${platform.name}`);
      
      const response = await callAIAPI(platform, messages || [], platforms, activeChatMode);
      
      // Add the AI response to the chat
      await addMessageMutation.mutateAsync({
        content: response,
        role: 'assistant',
        platformId: platform.id
      });
      
      console.log(`${platform.name} response added to chat`);
    } catch (error) {
      console.error(`Error with ${platformId} in free mode:`, error);
    }
  };

  return {
    sendSingleAgentMessage
  };
};
