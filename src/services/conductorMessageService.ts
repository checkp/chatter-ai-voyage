
import { supabase } from '@/integrations/supabase/client';
import { generateChatId } from '@/utils/chatUtils';
import type { Message } from '@/types/chat';

export interface ConductorMessageData {
  userMessage: string;
  chatId: string;
  conductorMessages: Message[];
  mainMessages: Message[];
}

export const saveConductorUserMessage = async (
  userMessage: string,
  conductorConversationId: string
): Promise<Message> => {
  const userMsgObj: Message = {
    id: generateChatId(),
    content: userMessage,
    sender: 'user',
    created_at: new Date().toISOString(),
    conversation_id: conductorConversationId,
    timestamp: new Date()
  };

  const { error } = await supabase
    .from('messages')
    .insert([{
      id: userMsgObj.id,
      content: userMsgObj.content,
      sender: userMsgObj.sender,
      conversation_id: conductorConversationId,
      created_at: userMsgObj.created_at
    }]);

  if (error) {
    console.error('Error saving user message to conductor:', error);
    throw error;
  }

  return userMsgObj;
};

export const saveConductorAIMessage = async (
  content: string,
  platform: string,
  conductorConversationId: string
): Promise<Message> => {
  const conductorMsgObj: Message = {
    id: generateChatId(),
    content,
    sender: 'ai',
    platform,
    created_at: new Date().toISOString(),
    conversation_id: conductorConversationId,
    timestamp: new Date()
  };

  const { error } = await supabase
    .from('messages')
    .insert([{
      id: conductorMsgObj.id,
      content: conductorMsgObj.content,
      sender: conductorMsgObj.sender,
      platform: conductorMsgObj.platform,
      conversation_id: conductorConversationId,
      created_at: conductorMsgObj.created_at
    }]);

  if (error) {
    console.error('Error saving conductor message:', error);
    throw error;
  }

  return conductorMsgObj;
};

export const saveMainChatUserMessage = async (
  userMessage: string,
  chatId: string
): Promise<Message> => {
  const mainUserMsgObj: Message = {
    id: generateChatId(),
    content: userMessage,
    sender: 'user',
    created_at: new Date().toISOString(),
    conversation_id: chatId,
    timestamp: new Date()
  };

  const { error } = await supabase
    .from('messages')
    .insert([{
      id: mainUserMsgObj.id,
      content: mainUserMsgObj.content,
      sender: mainUserMsgObj.sender,
      conversation_id: chatId,
      created_at: mainUserMsgObj.created_at
    }]);

  if (error) {
    console.error('Error saving user message to main chat:', error);
    throw error;
  }

  return mainUserMsgObj;
};

export const saveAgentResponses = async (agentResponses: Message[]): Promise<void> => {
  if (agentResponses.length === 0) return;

  const { error } = await supabase
    .from('messages')
    .insert(agentResponses.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      platform: msg.platform,
      conversation_id: msg.conversation_id,
      created_at: msg.created_at
    })));

  if (error) {
    console.error('Error saving agent messages:', error);
    throw error;
  }
};
