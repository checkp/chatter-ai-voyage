
import { generateChatId } from '@/utils/chatUtils';
import type { AIPlatform, Message } from '@/types/chat';
import {
  saveConductorUserMessage,
  saveConductorAIMessage,
  saveMainChatUserMessage,
  saveAgentResponses
} from './conductorMessageService';

interface ProcessConductorParams {
  chatId: string;
  userMessage: string;
  conductorMessages: Message[];
  mainMessages: Message[];
  platforms: AIPlatform[];
  conductorAgent: string;
  conductorConversationId: string;
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>;
}

export const createConductorPrompt = (
  userMessage: string,
  platforms: AIPlatform[]
): string => {
  return `You are the Conductor AI, an orchestrator of multi-AI conversations. Your role is to:

1. Analyze the user's message: "${userMessage}"
2. Translate it into optimal prompts for different AI agents
3. Coordinate their responses
4. Provide a synthesized summary

Available AI agents: ${platforms.filter(p => p.enabled).map(p => p.name).join(', ')}

First, acknowledge the user's request and explain how you'll process it with the AI agents.`;
};

export const createSummaryPrompt = (
  agentResponses: Message[],
  platforms: AIPlatform[]
): string => {
  return `Now summarize and synthesize these responses from the AI agents:

${agentResponses.map(msg => `${platforms.find(p => p.id === msg.platform)?.name}: ${msg.content}`).join('\n\n')}

Provide a coherent, synthesized response that captures the best insights from all agents.`;
};

export const getConductorResponse = async (
  conductorPlatform: AIPlatform,
  updatedConductorMessages: Message[],
  prompt: string,
  conductorConversationId: string,
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>
): Promise<Message> => {
  const response = await callAIAPI(
    conductorPlatform,
    [...updatedConductorMessages, {
      id: generateChatId(),
      content: prompt,
      sender: 'ai',
      platform: 'system',
      created_at: new Date().toISOString(),
      conversation_id: conductorConversationId,
      timestamp: new Date()
    }],
    [conductorPlatform]
  );

  return saveConductorAIMessage(response, conductorPlatform.id, conductorConversationId);
};

export const processAgentResponses = async (
  userMessage: string,
  chatId: string,
  mainMessages: Message[],
  enabledPlatforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>
): Promise<Message[]> => {
  const mainUserMsgObj = await saveMainChatUserMessage(userMessage, chatId);
  
  const agentPromises = enabledPlatforms.map(async (platform) => {
    try {
      const optimizedPrompt = `${userMessage}\n\n[Note: This message has been processed by our Conductor AI for optimal response coordination]`;
      
      const response = await callAIAPI(platform, [{
        id: generateChatId(),
        content: optimizedPrompt,
        sender: 'user',
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date()
      }], enabledPlatforms);

      return {
        id: generateChatId(),
        content: response,
        sender: 'ai' as const,
        platform: platform.id,
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error calling ${platform.name}:`, error);
      return null;
    }
  });

  const agentResponses = (await Promise.allSettled(agentPromises))
    .filter(result => result.status === 'fulfilled' && result.value !== null)
    .map(result => (result as PromiseFulfilledResult<Message>).value);

  await saveAgentResponses(agentResponses);
  return agentResponses;
};

export const processConductorMessageFlow = async (params: ProcessConductorParams) => {
  const {
    chatId,
    userMessage,
    conductorMessages,
    mainMessages,
    platforms,
    conductorAgent,
    conductorConversationId,
    callAIAPI
  } = params;

  console.log('Processing conductor message:', {
    originalChatId: chatId,
    conductorConversationId,
    userMessage: userMessage.substring(0, 50) + '...'
  });

  // Step 1: Save user message to conductor conversation
  const userMsgObj = await saveConductorUserMessage(userMessage, conductorConversationId);
  const updatedConductorMessages = [...conductorMessages, userMsgObj];

  // Step 2: Get conductor platform and initial response
  const conductorPlatform = platforms.find(p => p.id === conductorAgent);
  if (!conductorPlatform) throw new Error('Conductor platform not found');

  const conductorPrompt = createConductorPrompt(userMessage, platforms);
  const conductorMsgObj = await getConductorResponse(
    conductorPlatform,
    updatedConductorMessages,
    conductorPrompt,
    conductorConversationId,
    callAIAPI
  );

  // Step 3: Process agent responses
  const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
  const agentResponses = await processAgentResponses(
    userMessage,
    chatId,
    mainMessages,
    enabledPlatforms,
    callAIAPI
  );

  // Step 4: Generate conductor summary if we have agent responses
  if (agentResponses.length > 0) {
    const summaryPrompt = createSummaryPrompt(agentResponses, platforms);
    await getConductorResponse(
      conductorPlatform,
      [...updatedConductorMessages, conductorMsgObj],
      summaryPrompt,
      conductorConversationId,
      callAIAPI
    );
  }

  return { conductorMessages: updatedConductorMessages, agentResponses };
};
