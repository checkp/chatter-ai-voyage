import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';
import { callOpenAI, callDeepSeek, callClaudeAPI, callGrokAPI } from '@/services/aiApiService';
import { getDefaultModel } from '@/config/aiModels';

export const usePlatforms = (user: SupabaseUser | null) => {
  const [platforms, setPlatforms] = useState<AIPlatform[]>([
    { 
      id: 'openai', 
      name: 'ChatGPT', 
      enabled: true, // Default enabled for new users
      color: 'bg-agent-openai border-agent-openai text-cyber-bg', 
      icon: '🤖',
      hasApiKey: true, // Always true with centralized keys
      selectedModel: getDefaultModel('openai')
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      enabled: true, // Default enabled for new users
      color: 'bg-agent-anthropic border-agent-anthropic text-cyber-bg', 
      icon: '🎭',
      hasApiKey: true, // Always true with centralized keys
      selectedModel: getDefaultModel('anthropic')
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      enabled: true, // Default enabled for new users
      color: 'bg-agent-deepseek border-agent-deepseek text-cyber-bg', 
      icon: '🔍',
      hasApiKey: true, // Always true with centralized keys
      selectedModel: getDefaultModel('deepseek')
    },
    { 
      id: 'grok', 
      name: 'Grok', 
      enabled: true, // Default enabled for new users
      color: 'bg-agent-grok border-agent-grok text-cyber-bg', 
      icon: '🚀',
      hasApiKey: true, // Always true with centralized keys
      selectedModel: getDefaultModel('grok')
    },
  ]);

  const loadAgentSettings = async () => {
    if (!user) {
      // For non-authenticated users, keep defaults (all enabled)
      console.log('No user authenticated, using default platform settings');
      return;
    }

    try {
      const { data: settings, error } = await supabase
        .from('user_agent_settings')
        .select('platform, enabled, model')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading agent settings:', error);
        // Don't return early - keep defaults if there's an error
      }

      // If no settings exist, user gets the defaults (all enabled)
      if (!settings || settings.length === 0) {
        console.log('No agent settings found for user, keeping defaults (all enabled)');
        return;
      }

      const settingsMap = new Map((settings || []).map(setting => [
        setting.platform, 
        { enabled: setting.enabled, model: setting.model }
      ]));
      
      setPlatforms(prev => prev.map(platform => ({
        ...platform,
        enabled: settingsMap.has(platform.id) ? settingsMap.get(platform.id)?.enabled || false : true, // Default to enabled if no setting
        selectedModel: settingsMap.get(platform.id)?.model || getDefaultModel(platform.id),
        hasApiKey: true // Always true with centralized keys
      })));
    } catch (error: any) {
      console.error('Failed to load agent settings:', error);
      // Keep defaults on error
    }
  };

  const reloadSettings = async () => {
    await loadAgentSettings();
  };

  const saveAgentSetting = async (platformId: string, enabled: boolean, model?: string) => {
    if (!user) {
      console.log('Cannot save settings without authenticated user');
      return;
    }

    try {
      const updateData: any = {
        user_id: user.id,
        platform: platformId,
        enabled: enabled,
        updated_at: new Date().toISOString()
      };

      if (model) {
        updateData.model = model;
      }

      const { error } = await supabase
        .from('user_agent_settings')
        .upsert(updateData, {
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
    
    // Take the last 15 messages to maintain context but avoid token limits
    const recentMessages = messages.slice(-15);
    
    recentMessages.forEach(message => {
      if (message.sender === 'user') {
        conversationHistory.push({ 
          role: 'user', 
          content: message.content 
        });
      } else if (message.sender === 'ai') {
        // FIXED: Skip the current platform's own messages completely
        if (message.platform === platformId) {
          console.log(`Skipping ${platformId}'s own message:`, message.content.substring(0, 50));
          return;
        }
        
        // Include other AI agents' responses as system context
        if (message.platform && message.platform !== platformId) {
          const otherPlatform = enabledPlatforms.find(p => p.id === message.platform);
          const platformName = otherPlatform?.name || message.platform;
          conversationHistory.push({ 
            role: 'user', 
            content: `[${platformName} responded]: ${message.content}` 
          });
        }
      }
    });
    
    console.log(`Built conversation for ${platformId} with ${conversationHistory.length} messages`);
    return conversationHistory;
  };

  const callAIAPI = async (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const conversationHistory = buildConversationForPlatform(messages, platform.id, enabledPlatforms);
    
    // Enhanced multi-agent context instructions
    const otherAIs = enabledPlatforms.filter(p => p.id !== platform.id && p.enabled && p.hasApiKey);
    if (otherAIs.length > 0) {
      const contextMessage = `You are ${platform.name} in a multi-AI conversation with: ${otherAIs.map(p => p.name).join(', ')}.

IMPORTANT INSTRUCTIONS:
- You can see responses from other AI agents marked with [Agent Name responded]
- Build upon the conversation naturally, considering what others have said
- Add your unique perspective without simply repeating what others said
- If you disagree with another agent, explain your reasoning
- You can reference other agents' points when relevant
- Keep responses focused and add genuine value to the discussion
- Avoid redundant information already covered by other agents
- DO NOT reference or build upon your own previous responses

Your goal: Contribute meaningfully to this multi-agent conversation as ${platform.name}.`;
      
      conversationHistory.unshift({ role: 'user', content: contextMessage });
    } else {
      conversationHistory.unshift({ role: 'user', content: `You are ${platform.name}. Respond to the conversation naturally without referencing your previous responses.` });
    }

    console.log(`Calling ${platform.name} API with ${conversationHistory.length} messages and model: ${platform.selectedModel}`);
    
    const selectedModel = platform.selectedModel || getDefaultModel(platform.id);
    
    switch (platform.id) {
      case 'anthropic':
        return await callClaudeAPI(conversationHistory, selectedModel);
      case 'openai':
        return await callOpenAI(conversationHistory, user, selectedModel);
      case 'deepseek':
        return await callDeepSeek(conversationHistory, user, selectedModel);
      case 'grok':
        return await callGrokAPI(conversationHistory, user, selectedModel);
      default:
        throw new Error(`Unsupported platform: ${platform.id}`);
    }
  };

  useEffect(() => {
    loadAgentSettings();
  }, [user]);

  return {
    platforms,
    setPlatforms,
    togglePlatform,
    callAIAPI,
    reloadSettings
  };
};
