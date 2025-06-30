
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConductor } from '@/hooks/useConductor';
import { useConductorMode } from '@/hooks/useConductorMode';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message, ChatMode } from '@/types/chat';

interface ConductorHooksProps {
  user: SupabaseUser;
  platforms: AIPlatform[];
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>;
  activeChatId: string | null;
  activeChatMode: ChatMode;
  messages: Message[] | undefined;
}

export const useConductorHooks = ({
  user,
  platforms,
  callAIAPI,
  activeChatId,
  activeChatMode,
  messages
}: ConductorHooksProps) => {
  // Initialize conductor hook
  const {
    conductorState,
    conductorAnalysis,
    startConductor,
    stopConductor,
    requestConductorDirection
  } = useConductor(user);

  // Initialize conductor mode hook with callAIAPI function
  const {
    conductorAgent,
    setConductorAgent,
    isProcessing,
    processConductorMessage
  } = useConductorMode(user, platforms, callAIAPI);

  // Store conductor conversation ID in state
  const [conductorConversationId, setConductorConversationId] = React.useState<string | null>(null);

  // Create conductor conversation ID when activeChatId changes
  React.useEffect(() => {
    if (activeChatId && activeChatMode === 'conductor') {
      // Create a unique conductor conversation ID
      const newConductorId = `conductor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConductorConversationId(newConductorId);
    }
  }, [activeChatId, activeChatMode]);

  // Get conductor messages using the conductor conversation ID
  const { data: conductorMessages } = useQuery({
    queryKey: ['conductor_messages', conductorConversationId],
    queryFn: async () => {
      if (!conductorConversationId || activeChatMode !== 'conductor') return [];
      
      console.log('Fetching conductor messages for:', conductorConversationId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conductorConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conductor messages:', error);
        return [];
      }

      console.log('Found conductor messages:', data?.length || 0);

      return data?.map(msg => ({
        ...msg,
        sender: msg.sender as 'user' | 'ai',
        platform: msg.platform || undefined,
        timestamp: new Date(msg.created_at)
      })) || [];
    },
    enabled: !!conductorConversationId && activeChatMode === 'conductor'
  });

  // Show conductor summary state - now tracks both automatic analysis and requested guidance
  const [showConductorSummary, setShowConductorSummary] = React.useState(false);
  const [currentSummary, setCurrentSummary] = React.useState('');

  // Handle conductor direction request
  const handleRequestConductorDirection = async () => {
    if (!messages || !platforms) return;
    
    const enabledPlatforms = platforms.filter(p => p.enabled);
    const direction = await requestConductorDirection(messages, enabledPlatforms);
    
    if (direction) {
      setCurrentSummary(direction);
      setShowConductorSummary(true);
    }
  };

  // Handle conductor message send
  const handleConductorSend = async (message: string) => {
    if (!activeChatId || !message.trim()) return;
    
    try {
      await processConductorMessage(
        activeChatId,
        message,
        conductorMessages || [],
        messages || []
      );
    } catch (error) {
      console.error('Conductor send error:', error);
    }
  };

  // Update summary when conductor provides automatic analysis
  React.useEffect(() => {
    if (conductorState.lastSummary) {
      setCurrentSummary(conductorState.lastSummary);
      setShowConductorSummary(true);
    }
  }, [conductorState.lastSummary]);

  return {
    conductorState,
    startConductor,
    stopConductor,
    handleRequestConductorDirection,
    conductorMessages,
    conductorAgent,
    setConductorAgent,
    isProcessing,
    handleConductorSend,
    showConductorSummary,
    setShowConductorSummary,
    currentSummary
  };
};
