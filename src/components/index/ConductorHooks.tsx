
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

  // Get conductor messages for conductor mode - use ILIKE to handle the _conductor suffix
  const { data: conductorMessages } = useQuery({
    queryKey: ['messages', `${activeChatId}_conductor`],
    queryFn: async () => {
      if (!activeChatId || activeChatMode !== 'conductor') return [];
      
      const conductorConversationId = `${activeChatId}_conductor`;
      
      // Use ILIKE instead of exact match to handle the UUID vs string issue
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .ilike('conversation_id', conductorConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conductor messages:', error);
        return [];
      }

      return data?.map(msg => ({
        ...msg,
        sender: msg.sender as 'user' | 'ai',
        platform: msg.platform || undefined,
        timestamp: new Date(msg.created_at)
      })) || [];
    },
    enabled: !!activeChatId && activeChatMode === 'conductor'
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
