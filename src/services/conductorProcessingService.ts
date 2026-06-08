
import { generateChatId } from '@/utils/chatUtils';
import type { AIPlatform, Message } from '@/types/chat';
import { resolveConductorPrompt } from '@/config/conductorPrompt';
import {
  saveConductorUserMessage,
  saveConductorAIMessage,
  saveMainChatUserMessage,
  saveMainChatConductorMessage,
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
  conductorSystemPrompt?: string | null;
}

export const createDecisionPrompt = (
  userMessage: string,
  platforms: AIPlatform[],
  conductorSystemPrompt?: string | null
): string => {
  const framing = resolveConductorPrompt(conductorSystemPrompt);
  return `${framing}

User message: "${userMessage}"

Available AI agents: ${platforms.filter(p => p.enabled).map(p => p.name).join(', ')}

Respond with:
1. Your direct response to the user
2. At the end, add a decision marker: [COORDINATION_NEEDED: YES/NO]
3. If YES, briefly explain why multiple agents would be beneficial`;
};

export const createAgentCoordinationPrompt = (
  userMessage: string,
  conductorAnalysis: string,
  platforms: AIPlatform[],
  conductorSystemPrompt?: string | null
): string => {
  const framing = resolveConductorPrompt(conductorSystemPrompt);
  return `${framing}

I'm coordinating a multi-agent discussion based on this user request:

Original message: "${userMessage}"

My analysis: ${conductorAnalysis}

Available agents: ${platforms.filter(p => p.enabled).map(p => p.name).join(', ')}

Please provide your specialized perspective on this request. Focus on your unique strengths and approach.`;
};

export const createSummaryPrompt = (
  agentResponses: Message[],
  platforms: AIPlatform[],
  conductorSystemPrompt?: string | null
): string => {
  const framing = resolveConductorPrompt(conductorSystemPrompt);
  return `${framing}

Now summarize and synthesize these responses from the AI agents:

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

export const processAgentResponsesWithConductorPrompt = async (
  conductorPrompt: string,
  chatId: string,
  mainMessages: Message[],
  enabledPlatforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>
): Promise<Message[]> => {
  // Save the conductor's coordination prompt as a visible message in main chat
  const coordinationMessage = await saveMainChatConductorMessage(conductorPrompt, chatId);
  
  // Build updated message history including the conductor's coordination message
  const updatedMainMessages = [...mainMessages, coordinationMessage];
  
  const agentPromises = enabledPlatforms.map(async (platform) => {
    try {
      // Use conversation history with conductor's coordination prompt
      const messagesForAgent = updatedMainMessages;
      
      const response = await callAIAPI(platform, messagesForAgent, enabledPlatforms);

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
    callAIAPI,
    conductorSystemPrompt
  } = params;


  console.log('Processing conductor message:', {
    originalChatId: chatId,
    conductorConversationId,
    userMessage: userMessage.substring(0, 50) + '...'
  });

  // Step 1: Save user message to conductor conversation
  const userMsgObj = await saveConductorUserMessage(userMessage, conductorConversationId, chatId);
  const updatedConductorMessages = [...conductorMessages, userMsgObj];

  // Step 2: Get conductor platform and decision response
  const conductorPlatform = platforms.find(p => p.id === conductorAgent);
  if (!conductorPlatform) throw new Error('Conductor platform not found');

  // Phase 1: Get conductor's decision about coordination
  const decisionPrompt = createDecisionPrompt(userMessage, platforms, conductorSystemPrompt);
  const conductorMsgObj = await getConductorResponse(
    conductorPlatform,
    updatedConductorMessages,
    decisionPrompt,
    conductorConversationId,
    callAIAPI
  );

  // Step 3: Check if conductor decided coordination is needed
  const coordinationNeeded = conductorMsgObj.content.includes('[COORDINATION_NEEDED: YES]');
  let agentResponses: Message[] = [];
  
  if (coordinationNeeded) {
    console.log('Conductor decided coordination is needed, triggering agents...');
    
    // Phase 2: Create agent coordination prompt
    const coordinationPrompt = createAgentCoordinationPrompt(
      userMessage,
      conductorMsgObj.content,
      platforms,
      conductorSystemPrompt
    );

    
    const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);
    agentResponses = await processAgentResponsesWithConductorPrompt(
      coordinationPrompt,
      chatId,
      mainMessages,
      enabledPlatforms,
      callAIAPI
    );

    // Step 4: Generate conductor summary if we have agent responses
    if (agentResponses.length > 0) {
      const summaryPrompt = createSummaryPrompt(agentResponses, platforms, conductorSystemPrompt);
      await getConductorResponse(
        conductorPlatform,
        [...updatedConductorMessages, conductorMsgObj],
        summaryPrompt,
        conductorConversationId,
        callAIAPI
      );
    }
  } else {
    console.log('Conductor handled the request directly, no agent coordination needed');
  }

  return { conductorMessages: updatedConductorMessages, agentResponses };
};
