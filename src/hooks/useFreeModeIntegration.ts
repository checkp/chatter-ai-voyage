
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
  // Send single agent message function for free mode
  const sendSingleAgentMessage = async (chatId: string, message: string, platformId: string) => {
    if (!user || !activeChatId) return;
    
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) {
        console.error(`Platform not found: ${platformId}`);
        return;
      }
      
      const response = await callAIAPI(platform, messages || [], platforms, activeChatMode);
      
      // Add the AI response to the chat
      // This would typically go through the message handling system
      console.log(`${platform.name} response:`, response);
    } catch (error) {
      console.error(`Error with ${platformId}:`, error);
    }
  };

  return {
    sendSingleAgentMessage
  };
};
