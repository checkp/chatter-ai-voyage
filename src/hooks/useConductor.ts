
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { AIPlatform, Message } from '@/types/chat';
import { callOpenAI } from '@/services/aiApiService';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ConductorState {
  isActive: boolean;
  isAnalyzing: boolean;
  lastSummary: string | null;
  conversationCount: number;
}

export const useConductor = (user: SupabaseUser | null) => {
  const [conductorState, setConductorState] = useState<ConductorState>({
    isActive: false,
    isAnalyzing: false,
    lastSummary: null,
    conversationCount: 0
  });

  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeConversation = useCallback(async (
    messages: Message[],
    enabledPlatforms: AIPlatform[]
  ): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    // Take the last 10 messages for analysis
    const recentMessages = messages.slice(-10);
    
    // Build context about the conversation
    const conversationContext = recentMessages.map(msg => {
      if (msg.sender === 'user') {
        return `User: ${msg.content}`;
      } else {
        const platform = enabledPlatforms.find(p => p.id === msg.platform);
        return `${platform?.name || 'AI'}: ${msg.content}`;
      }
    }).join('\n\n');

    const conductorPrompt = `You are the Conductor AI, an orchestrator and analyst of multi-AI conversations. Your role is to:

1. Analyze the current conversation flow and quality
2. Identify gaps or areas needing clarification
3. Suggest which AI agents should respond next and why
4. Provide a brief summary of key points discussed
5. Direct the conversation toward productive outcomes

Current conversation context:
${conversationContext}

Available AI agents: ${enabledPlatforms.map(p => p.name).join(', ')}

Please provide:
1. A brief summary of the current discussion
2. Assessment of conversation quality and direction
3. Recommendations for which AI agents should contribute next
4. Any questions or topics that need addressing

Keep your response concise but insightful.`;

    const conversationHistory = [
      { role: 'user' as const, content: conductorPrompt }
    ];

    const response = await callOpenAI(conversationHistory, user, 'gpt-4o-mini');
    return response;
  }, [user]);

  const conductorAnalysis = useCallback(async (
    messages: Message[],
    enabledPlatforms: AIPlatform[]
  ) => {
    if (!conductorState.isActive || messages.length === 0) return;

    setConductorState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const analysis = await analyzeConversation(messages, enabledPlatforms);
      
      setConductorState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastSummary: analysis,
        conversationCount: prev.conversationCount + 1
      }));

      return analysis;
    } catch (error) {
      console.error('Conductor analysis failed:', error);
      setConductorState(prev => ({ ...prev, isAnalyzing: false }));
      toast.error('Conductor analysis failed');
      return null;
    }
  }, [conductorState.isActive, analyzeConversation]);

  const startConductor = useCallback(() => {
    setConductorState(prev => ({
      ...prev,
      isActive: true,
      conversationCount: 0
    }));
    toast.success('Conductor AI activated - monitoring conversation');
  }, []);

  const stopConductor = useCallback(() => {
    setConductorState(prev => ({
      ...prev,
      isActive: false,
      isAnalyzing: false
    }));
    
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    toast.info('Conductor AI deactivated');
  }, []);

  const requestConductorDirection = useCallback(async (
    messages: Message[],
    enabledPlatforms: AIPlatform[]
  ) => {
    if (!user) return null;

    setConductorState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const direction = await analyzeConversation(messages, enabledPlatforms);
      setConductorState(prev => ({ ...prev, isAnalyzing: false }));
      return direction;
    } catch (error) {
      console.error('Conductor direction failed:', error);
      setConductorState(prev => ({ ...prev, isAnalyzing: false }));
      return null;
    }
  }, [user, analyzeConversation]);

  return {
    conductorState,
    conductorAnalysis,
    startConductor,
    stopConductor,
    requestConductorDirection
  };
};
