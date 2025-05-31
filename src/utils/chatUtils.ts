
import type { Chat, Message, AIPlatform } from '@/types/chat';

export const generateChatId = (): string => {
  return crypto.randomUUID();
};

export const buildConversationHistory = (chat: Chat): Array<{role: 'user' | 'assistant', content: string}> => {
  return chat.messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
    content: msg.content
  }));
};

export const buildConversationHistoryForAgent = (
  chat: Chat, 
  agentPlatform: string, 
  platforms: AIPlatform[]
): Array<{role: 'user' | 'assistant', content: string}> => {
  const history: Array<{role: 'user' | 'assistant', content: string}> = [];
  
  chat.messages.forEach(msg => {
    if (msg.sender === 'user') {
      history.push({
        role: 'user' as const,
        content: msg.content
      });
    } else if (msg.sender === 'ai') {
      if (msg.platform === agentPlatform) {
        history.push({
          role: 'assistant' as const,
          content: msg.content
        });
      } else if (msg.platform && msg.platform !== agentPlatform) {
        const platform = platforms.find(p => p.id === msg.platform);
        const platformName = platform ? platform.name : msg.platform;
        history.push({
          role: 'assistant' as const,
          content: `[Response from ${platformName}]: ${msg.content}`
        });
      }
    }
  });

  return history;
};
