
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConductor } from '@/hooks/useConductor';
import { useConductorMode } from '@/hooks/useConductorMode';
import { generateChatId } from '@/utils/chatUtils';
import { useActivityLog } from '@/contexts/ActivityLogContext';
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
  const { addEntry } = useActivityLog();
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
  } = useConductorMode(user, platforms, callAIAPI, activeChatId);

  // Store conductor conversation ID using a proper UUID format
  const [conductorConversationId, setConductorConversationId] = React.useState<string | null>(null);

  // Look up existing conductor conversation or create a new one when activeChatId changes
  React.useEffect(() => {
    if (!activeChatId || activeChatMode !== 'conductor') {
      setConductorConversationId(null);
      return;
    }

    const findOrCreateConductorConversation = async () => {
      // Look for an existing conductor conversation linked to this chat
      const conductorTitle = `Conductor: ${activeChatId}`;
      const { data: existing, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('chat_mode', 'conductor')
        .eq('title', conductorTitle)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error looking up conductor conversation:', error);
      }

      if (existing) {
        console.log('Found existing conductor conversation:', existing.id);
        setConductorConversationId(existing.id);
      } else {
        const newConductorId = generateChatId();
        console.log('Creating new conductor conversation ID:', newConductorId);
        setConductorConversationId(newConductorId);
      }
    };

    findOrCreateConductorConversation();
  }, [activeChatId, activeChatMode, user.id]);

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
    addEntry('conductor', 'Requesting direction analysis...');
    const enabledPlatforms = platforms.filter(p => p.enabled);
    const direction = await requestConductorDirection(messages, enabledPlatforms);
    
    if (direction) {
      addEntry('conductor', 'Direction received');
      setCurrentSummary(direction);
      setShowConductorSummary(true);
    }
  };

  // Handle conductor message send
  const handleConductorSend = async (message: string) => {
    if (!activeChatId || !message.trim() || !conductorConversationId) {
      console.error('Missing required data for conductor send:', { activeChatId, message: !!message.trim(), conductorConversationId });
      return;
    }
    
    try {
      addEntry('conductor', `Processing: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
      console.log('Sending conductor message:', { activeChatId, conductorConversationId, message: message.substring(0, 50) });
      
      await processConductorMessage(
        activeChatId,
        message,
        conductorMessages || [],
        messages || [],
        conductorConversationId
      );
      addEntry('conductor', 'Processing complete');
    } catch (error) {
      console.error('Conductor send error:', error);
      addEntry('error', `Conductor error: ${error instanceof Error ? error.message : 'Unknown'}`, 'Conductor');
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
