
import { useState, useCallback, useRef } from 'react';
import type { Message, AIPlatform, Chat, ConductorState } from '@/types/chat';
import { toast } from 'sonner';

export const useConductorDiscussion = (
  platforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>,
  addMessage: (chatId: string, message: Message) => void,
  getCurrentChat: () => Chat | null
) => {
  const [conductorState, setConductorState] = useState<ConductorState>({
    isActive: false,
    conductorPlatform: null,
    internalConversation: [],
    summaryTriggerCount: 0,
    discussionRounds: 0,
    maxRounds: 3
  });

  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const internalDiscussionRef = useRef<Message[]>([]);
  const activeInternalResponders = useRef<Set<string>>(new Set());

  const getConductorPlatform = useCallback(() => {
    return platforms.find(p => p.id === conductorState.conductorPlatform);
  }, [platforms, conductorState.conductorPlatform]);

  const getNonConductorPlatforms = useCallback(() => {
    return platforms.filter(p => 
      p.enabled && 
      p.hasApiKey && 
      p.id !== conductorState.conductorPlatform
    );
  }, [platforms, conductorState.conductorPlatform]);

  const setConductorPlatform = useCallback((platformId: string | null) => {
    setConductorState(prev => ({
      ...prev,
      conductorPlatform: platformId,
      isActive: false,
      internalConversation: [],
      discussionRounds: 0
    }));
  }, []);

  const addInternalMessage = useCallback((message: Message) => {
    const internalMessage: Message = {
      ...message,
      messageType: 'agent-internal',
      isInternal: true
    };
    
    internalDiscussionRef.current = [...internalDiscussionRef.current, internalMessage];
    
    setConductorState(prev => ({
      ...prev,
      internalConversation: [...prev.internalConversation, internalMessage]
    }));
  }, []);

  const generateConductorPrompt = useCallback((internalMessages: Message[], userMessage: string) => {
    const discussion = internalMessages
      .filter(m => m.messageType === 'agent-internal')
      .map(m => `${m.platform}: ${m.content}`)
      .join('\n\n');

    return `You are acting as a conductor/moderator for a multi-AI discussion. The user asked: "${userMessage}"

The other AI agents have been discussing this topic internally. Here's their conversation:

${discussion}

Your role is to:
1. Analyze the discussion above
2. Identify key points, agreements, and disagreements
3. Synthesize the information into a clear, coherent response for the user
4. Highlight different perspectives where relevant
5. Provide a balanced summary that captures the essence of the discussion

Please provide a well-structured response that summarizes the AI discussion and answers the user's question effectively.`;
  }, []);

  const processInternalDiscussion = useCallback(async (
    chatId: string,
    userMessage: Message,
    nonConductorPlatforms: AIPlatform[]
  ) => {
    console.log('=== STARTING INTERNAL DISCUSSION ===');
    console.log('Non-conductor platforms:', nonConductorPlatforms.map(p => p.name));

    const currentChat = getCurrentChat();
    if (!currentChat) {
      console.error('No current chat found');
      return;
    }

    // Get conversation context (exclude internal messages for now)
    const contextMessages = currentChat.messages?.filter(m => !m.isInternal) || [];
    const discussionContext = [...contextMessages, userMessage];

    // Start internal discussion among non-conductor agents
    activeInternalResponders.current = new Set(nonConductorPlatforms.map(p => p.id));

    for (const platform of nonConductorPlatforms) {
      try {
        console.log(`[${platform.name}] Starting internal response...`);
        
        const response = await callAIAPI(platform, discussionContext, nonConductorPlatforms);
        
        const internalMessage: Message = {
          id: crypto.randomUUID(),
          content: response,
          sender: 'ai',
          platform: platform.id,
          created_at: new Date().toISOString(),
          conversation_id: chatId,
          timestamp: new Date(),
          status: 'sent',
          messageType: 'agent-internal',
          isInternal: true,
          roundNumber: conductorState.discussionRounds + 1
        };

        addInternalMessage(internalMessage);
        console.log(`[${platform.name}] Internal message added`);

        activeInternalResponders.current.delete(platform.id);

      } catch (error) {
        console.error(`[${platform.name}] Internal discussion error:`, error);
        activeInternalResponders.current.delete(platform.id);
      }
    }

    // Check if all internal responses are complete
    if (activeInternalResponders.current.size === 0) {
      setTimeout(() => {
        checkForConductorSummary(chatId, userMessage.content);
      }, 2000);
    }
  }, [callAIAPI, addInternalMessage, getCurrentChat, conductorState.discussionRounds]);

  const checkForConductorSummary = useCallback(async (chatId: string, originalUserMessage: string) => {
    console.log('=== CHECKING FOR CONDUCTOR SUMMARY ===');
    
    const conductor = getConductorPlatform();
    if (!conductor) {
      console.error('No conductor platform found');
      return;
    }

    setConductorState(prev => ({
      ...prev,
      discussionRounds: prev.discussionRounds + 1
    }));

    const shouldContinueDiscussion = 
      conductorState.discussionRounds < conductorState.maxRounds - 1 &&
      Math.random() > 0.4; // 60% chance to continue

    if (shouldContinueDiscussion && internalDiscussionRef.current.length > 0) {
      console.log('Continuing internal discussion for another round...');
      
      const nonConductorPlatforms = getNonConductorPlatforms();
      const selectedPlatforms = nonConductorPlatforms.filter(() => Math.random() > 0.3);
      
      if (selectedPlatforms.length > 0) {
        await processInternalDiscussion(chatId, {
          id: crypto.randomUUID(),
          content: `Continue the discussion considering the points raised so far.`,
          sender: 'user',
          created_at: new Date().toISOString(),
          conversation_id: chatId,
          timestamp: new Date()
        }, selectedPlatforms);
        return;
      }
    }

    // Generate conductor summary
    console.log('Generating conductor summary...');
    
    try {
      const conductorPrompt = generateConductorPrompt(internalDiscussionRef.current, originalUserMessage);
      
      const summaryResponse = await callAIAPI(conductor, [{
        id: crypto.randomUUID(),
        content: conductorPrompt,
        sender: 'user',
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date()
      }], [conductor]);

      const conductorMessage: Message = {
        id: crypto.randomUUID(),
        content: summaryResponse,
        sender: 'ai',
        platform: conductor.id,
        created_at: new Date().toISOString(),
        conversation_id: chatId,
        timestamp: new Date(),
        status: 'sent',
        messageType: 'conductor-summary',
        isInternal: false,
        relatedInternalMessages: internalDiscussionRef.current.map(m => m.id)
      };

      addMessage(chatId, conductorMessage);
      console.log('Conductor summary generated and added');

      // Reset for next discussion
      internalDiscussionRef.current = [];
      setConductorState(prev => ({
        ...prev,
        isActive: false,
        internalConversation: [],
        discussionRounds: 0
      }));

    } catch (error) {
      console.error('Error generating conductor summary:', error);
      toast.error('Failed to generate conductor summary');
    }
  }, [getConductorPlatform, generateConductorPrompt, callAIAPI, addMessage, conductorState, getNonConductorPlatforms, processInternalDiscussion]);

  const startConductorDiscussion = useCallback(async (
    chatId: string,
    userMessage: Message
  ) => {
    console.log('=== STARTING CONDUCTOR DISCUSSION ===');
    
    const conductor = getConductorPlatform();
    if (!conductor) {
      toast.error('Please select a conductor platform first');
      return;
    }

    const nonConductorPlatforms = getNonConductorPlatforms();
    if (nonConductorPlatforms.length === 0) {
      toast.error('Need at least one other AI platform enabled besides the conductor');
      return;
    }

    setConductorState(prev => ({
      ...prev,
      isActive: true,
      discussionRounds: 0,
      internalConversation: []
    }));

    // Start the internal discussion
    await processInternalDiscussion(chatId, userMessage, nonConductorPlatforms);

  }, [getConductorPlatform, getNonConductorPlatforms, processInternalDiscussion]);

  const stopConductorDiscussion = useCallback(() => {
    console.log('=== STOPPING CONDUCTOR DISCUSSION ===');
    
    setConductorState(prev => ({
      ...prev,
      isActive: false,
      internalConversation: [],
      discussionRounds: 0
    }));

    internalDiscussionRef.current = [];
    activeInternalResponders.current.clear();
    
    toast.info('Conductor discussion stopped');
  }, []);

  return {
    conductorState,
    showDebugPanel,
    setShowDebugPanel,
    setConductorPlatform,
    startConductorDiscussion,
    stopConductorDiscussion,
    isActive: conductorState.isActive,
    internalConversation: conductorState.internalConversation,
    conductorPlatform: conductorState.conductorPlatform,
    availableConductors: platforms.filter(p => p.enabled && p.hasApiKey)
  };
};
