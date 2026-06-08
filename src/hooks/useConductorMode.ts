
import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import { processConductorMessageFlow } from '@/services/conductorProcessingService';

export const useConductorMode = (
  user: SupabaseUser | null,
  platforms: AIPlatform[],
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>,
  activeChatId?: string | null
) => {
  const [conductorAgent, setConductorAgentState] = useState('openai');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conductorSystemPrompt, setConductorSystemPrompt] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Load user's custom conductor prompt
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('custom_conductor_prompt')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setConductorSystemPrompt((data as any)?.custom_conductor_prompt ?? null);
      });
  }, [user]);


  // Load conductor_platform from the conversation when activeChatId changes
  useEffect(() => {
    if (!activeChatId || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('conductor_platform')
        .eq('id', activeChatId)
        .maybeSingle();
      if (data?.conductor_platform) {
        setConductorAgentState(data.conductor_platform);
      }
    };
    load();
  }, [activeChatId, user]);

  // Wrap setConductorAgent to also persist to DB
  const setConductorAgent = useCallback((agent: string) => {
    setConductorAgentState(agent);
    if (activeChatId) {
      supabase
        .from('conversations')
        .update({ conductor_platform: agent })
        .eq('id', activeChatId)
        .then(({ error }) => {
          if (error) console.error('Failed to persist conductor agent:', error);
        });
    }
  }, [activeChatId]);

  const processConductorMessage = useCallback(async (
    chatId: string,
    userMessage: string,
    conductorMessages: Message[],
    mainMessages: Message[],
    conductorConversationId: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    setIsProcessing(true);

    try {
      const result = await processConductorMessageFlow({
        chatId,
        userMessage,
        conductorMessages,
        mainMessages,
        platforms,
        conductorAgent,
        conductorConversationId,
        callAIAPI,
        conductorSystemPrompt
      });


      queryClient.invalidateQueries({ queryKey: ['conductor_messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

      return result;
    } catch (error) {
      console.error('Conductor processing error:', error);
      toast.error('Failed to process conductor request');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [user, platforms, conductorAgent, callAIAPI, queryClient]);

  return {
    conductorAgent,
    setConductorAgent,
    isProcessing,
    processConductorMessage
  };
};
