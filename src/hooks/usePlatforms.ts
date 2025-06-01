import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import { callOpenAI, callDeepSeek, callClaudeAPI, callGrokAPI } from '@/services/aiApiService';

export const usePlatforms = (user: SupabaseUser | null) => {
  const [platforms, setPlatforms] = useState<AIPlatform[]>([
    { 
      id: 'openai', 
      name: 'ChatGPT', 
      enabled: false, 
      color: 'bg-agent-openai border-agent-openai text-cyber-bg', 
      icon: '🤖',
      hasApiKey: false
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      enabled: false,
      color: 'bg-agent-anthropic border-agent-anthropic text-cyber-bg', 
      icon: '🎭',
      hasApiKey: false
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      enabled: false, 
      color: 'bg-agent-deepseek border-agent-deepseek text-cyber-bg', 
      icon: '🔍',
      hasApiKey: false
    },
    { 
      id: 'grok', 
      name: 'Grok', 
      enabled: false, 
      color: 'bg-agent-grok border-agent-grok text-cyber-bg', 
      icon: '🚀',
      hasApiKey: false
    },
  ]);

  const loadApiKeysStatus = async () => {
    if (!user) return;

    try {
      const { data: apiKeys, error } = await supabase
        .from('user_api_keys')
        .select('platform')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading API keys:', error);
        return;
      }

      const platformsWithKeys = new Set((apiKeys || []).map(key => key.platform));
      
      setPlatforms(prev => prev.map(platform => ({
        ...platform,
        hasApiKey: platformsWithKeys.has(platform.id)
      })));
    } catch (error: any) {
      console.error('Failed to load API keys status:', error);
    }
  };

  const loadAgentSettings = async () => {
    if (!user) return;

    try {
      const { data: settings, error } = await supabase
        .from('user_agent_settings')
        .select('platform, enabled')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading agent settings:', error);
        return;
      }

      const settingsMap = new Map((settings || []).map(setting => [setting.platform, setting.enabled]));
      
      setPlatforms(prev => prev.map(platform => ({
        ...platform,
        enabled: settingsMap.get(platform.id) || false
      })));
    } catch (error: any) {
      console.error('Failed to load agent settings:', error);
    }
  };

  const saveAgentSetting = async (platformId: string, enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_agent_settings')
        .upsert({
          user_id: user.id,
          platform: platformId,
          enabled: enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error('Error saving agent setting:', error);
        toast.error('Failed to save agent setting');
      }
    } catch (error: any) {
      console.error('Failed to save agent setting:', error);
      toast.error('Failed to save agent setting');
    }
  };

  const togglePlatform = async (platformId: string) => {
    console.log('togglePlatform called for:', platformId);
    const platform = platforms.find(p => p.id === platformId);
    console.log('Platform found:', platform);
    
    if (!platform) {
      console.log('Platform not found');
      return;
    }
    
    if (!platform.hasApiKey) {
      toast.error('Please add an API key for this platform first');
      return;
    }

    const newEnabled = !platform.enabled;
    console.log('Setting enabled to:', newEnabled);
    
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, enabled: newEnabled } : p
    ));

    await saveAgentSetting(platformId, newEnabled);
    console.log('Platform toggle saved to database');
  };

  const buildConversationForPlatform = (messages: Message[], platformId: string, enabledPlatforms: AIPlatform[]): Array<{role: 'user' | 'assistant', content: string}> => {
    const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
    
    // Take the last 20 messages to maintain context but avoid token limits
    const recentMessages = messages.slice(-20);
    
    recentMessages.forEach(message => {
      if (message.sender === 'user') {
        conversationHistory.push({ role: 'user', content: message.content });
      } else if (message.sender === 'ai' && message.platform) {
        // Include this platform's own messages as assistant responses
        if (message.platform === platformId) {
          conversationHistory.push({ 
            role: 'assistant', 
            content: message.content 
          });
        } else {
          // Include other AI responses as context from other agents
          const senderPlatform = enabledPlatforms.find(p => p.id === message.platform);
          if (senderPlatform) {
            conversationHistory.push({ 
              role: 'user', 
              content: `[${senderPlatform.name} said]: ${message.content}` 
            });
          }
        }
      }
    });
    
    return conversationHistory;
  };

  const callAIAPI = async (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const conversationHistory = buildConversationForPlatform(messages, platform.id, enabledPlatforms);
    
    // Enhanced multi-agent context
    const otherAIs = enabledPlatforms.filter(p => p.id !== platform.id && p.enabled && p.hasApiKey);
    if (otherAIs.length > 0) {
      const contextMessage = `You are ${platform.name} participating in a multi-round AI discussion with: ${otherAIs.map(p => p.name).join(', ')}.

DISCUSSION GUIDELINES:
- Build upon, challenge, or complement what other AIs have said
- Reference other agents' points naturally (e.g., "As Claude mentioned..." or "I disagree with ChatGPT because...")
- Ask questions to deepen the conversation
- Share your unique perspective as ${platform.name}
- Keep responses engaging and conversational (2-4 sentences typically)
- If you strongly agree/disagree with another AI, explain why
- Bring up new angles or considerations others may have missed

The conversation includes responses from other AIs marked as "[AI Name] said: ..." - you can reference and respond to these.

Respond as ${platform.name} with your distinctive voice and perspective.`;
      
      conversationHistory.unshift({ role: 'user', content: contextMessage });
    } else {
      // Single AI context  
      conversationHistory.unshift({ role: 'user', content: `You are ${platform.name}. Respond as ${platform.name} with your distinctive perspective.` });
    }

    console.log(`Calling ${platform.name} API with ${conversationHistory.length} messages`);
    
    switch (platform.id) {
      case 'anthropic':
        return await callClaudeAPI(conversationHistory);
      case 'openai':
        return await callOpenAI(conversationHistory, user);
      case 'deepseek':
        return await callDeepSeek(conversationHistory, user);
      case 'grok':
        return await callGrokAPI(conversationHistory, user);
      default:
        throw new Error(`Unsupported platform: ${platform.id}`);
    }
  };

  useEffect(() => {
    if (user) {
      loadAgentSettings();
      loadApiKeysStatus();
    }
  }, [user]);

  return {
    platforms,
    setPlatforms,
    togglePlatform,
    callAIAPI,
    loadApiKeysStatus
  };
};
