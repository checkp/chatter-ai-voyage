
import { supabase } from '@/integrations/supabase/client';
import { generateChatId } from '@/utils/chatUtils';
import type { Message } from '@/types/chat';

export interface ConductorMessageData {
  userMessage: string;
  chatId: string;
  conductorMessages: Message[];
  mainMessages: Message[];
}

const ensureConversationExists = async (conversationId: string): Promise<void> => {
  console.log('Checking if conversation exists:', conversationId);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if conversation exists
  const { data: existingConversation, error: checkError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversationId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking conversation:', checkError);
    throw checkError;
  }

  if (!existingConversation) {
    console.log('Creating new conversation:', conversationId);
    // Create conversation if it doesn't exist
    const { error: insertError } = await supabase
      .from('conversations')
      .insert([{
        id: conversationId,
        user_id: user.id,
        title: 'Conductor Conversation',
        chat_mode: 'conductor'
      }]);

    if (insertError) {
      console.error('Error creating conversation:', insertError);
      throw insertError;
    }
    console.log('Successfully created conversation:', conversationId);
  } else if (existingConversation.user_id !== user.id) {
    throw new Error('Unauthorized access to conversation');
  }
};

export const saveConductorUserMessage = async (
  userMessage: string,
  conductorConversationId: string
): Promise<Message> => {
  console.log('Saving conductor user message:', { userMessage: userMessage.substring(0, 50), conductorConversationId });
  
  // Ensure conversation exists first
  await ensureConversationExists(conductorConversationId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

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

  console.log('Successfully saved conductor user message');
  return userMsgObj;
};

export const saveConductorAIMessage = async (
  content: string,
  platform: string,
  conductorConversationId: string
): Promise<Message> => {
  console.log('Saving conductor AI message:', { platform, conductorConversationId });
  
  // Ensure conversation exists first
  await ensureConversationExists(conductorConversationId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

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

  console.log('Successfully saved conductor AI message');
  return conductorMsgObj;
};

export const saveMainChatUserMessage = async (
  userMessage: string,
  chatId: string
): Promise<Message> => {
  console.log('Saving main chat user message:', { userMessage: userMessage.substring(0, 50), chatId });
  
  // Ensure conversation exists first
  await ensureConversationExists(chatId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

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

  console.log('Successfully saved main chat user message');
  return mainUserMsgObj;
};

export const saveMainChatConductorMessage = async (
  conductorPrompt: string,
  chatId: string
): Promise<Message> => {
  console.log('Saving conductor coordination message:', { chatId });
  
  // Ensure conversation exists first
  await ensureConversationExists(chatId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const conductorMsgObj: Message = {
    id: generateChatId(),
    content: `🎭 **Conductor coordinating agents:**\n\n${conductorPrompt}`,
    sender: 'ai',
    platform: 'conductor',
    created_at: new Date().toISOString(),
    conversation_id: chatId,
    timestamp: new Date()
  };

  const { error } = await supabase
    .from('messages')
    .insert([{
      id: conductorMsgObj.id,
      content: conductorMsgObj.content,
      sender: conductorMsgObj.sender,
      platform: conductorMsgObj.platform,
      conversation_id: chatId,
      created_at: conductorMsgObj.created_at
    }]);

  if (error) {
    console.error('Error saving conductor coordination message:', error);
    throw error;
  }

  console.log('Successfully saved conductor coordination message');
  return conductorMsgObj;
};

export const saveAgentResponses = async (agentResponses: Message[]): Promise<void> => {
  if (agentResponses.length === 0) return;

  console.log('Saving agent responses:', agentResponses.length);

  // Ensure all conversations exist
  const conversationIds = [...new Set(agentResponses.map(msg => msg.conversation_id))];
  for (const conversationId of conversationIds) {
    await ensureConversationExists(conversationId);
  }

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

  console.log('Successfully saved agent responses');
};
