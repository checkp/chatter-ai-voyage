import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message, ChatMode } from '@/types/chat';
import { callOpenAI, callDeepSeek, callClaudeAPI, callGrokAPI, callGeminiAPI } from '@/services/aiApiService';
import { getDefaultModel, getModelConfig } from '@/config/aiModels';

const resolvePlatformModel = (platformId: string, model?: string | null) => {
  if (!model) {
    return getDefaultModel(platformId);
  }

  return getModelConfig(platformId, model) ? model : getDefaultModel(platformId);
};

export const usePlatforms = (user: SupabaseUser | null) => {
  const [platforms, setPlatforms] = useState<AIPlatform[]>([
    { 
      id: 'openai', 
      name: 'ChatGPT', 
      enabled: true,
      color: 'bg-agent-openai border-agent-openai text-cyber-bg', 
      icon: '🤖',
      hasApiKey: true,
      selectedModel: getDefaultModel('openai'),
      displayOrder: 1
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      enabled: true,
      color: 'bg-agent-anthropic border-agent-anthropic text-cyber-bg', 
      icon: '🎭',
      hasApiKey: true,
      selectedModel: getDefaultModel('anthropic'),
      displayOrder: 2
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      enabled: true,
      color: 'bg-agent-deepseek border-agent-deepseek text-cyber-bg', 
      icon: '🔍',
      hasApiKey: true,
      selectedModel: getDefaultModel('deepseek'),
      displayOrder: 3
    },
    { 
      id: 'grok', 
      name: 'Grok', 
      enabled: true,
      color: 'bg-agent-grok border-agent-grok text-cyber-bg', 
      icon: '🚀',
      hasApiKey: true,
      selectedModel: getDefaultModel('grok'),
      displayOrder: 4
    },
    { 
      id: 'google', 
      name: 'Gemini', 
      enabled: true,
      color: 'bg-agent-google border-agent-google text-cyber-bg', 
      icon: '💎',
      hasApiKey: true,
      selectedModel: getDefaultModel('google'),
      displayOrder: 5
    },
  ]);

  const loadingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const loadAgentSettings = useCallback(async () => {
    if (!user) {
      console.log('No user authenticated, using default platform settings');
      return;
    }

    if (loadingRef.current) {
      console.log('Already loading agent settings, skipping');
      return;
    }

    if (lastUserIdRef.current === user.id) {
      console.log('User unchanged, skipping agent settings reload');
      return;
    }

    loadingRef.current = true;
    lastUserIdRef.current = user.id;

    try {
      const { data: settings, error } = await supabase
        .from('user_agent_settings')
        .select('platform, enabled, model, display_order')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading agent settings:', error);
        return;
      }

      if (!settings || settings.length === 0) {
        console.log('No agent settings found for user, keeping defaults (all enabled)');
        return;
      }

      const settingsMap = new Map((settings || []).map(setting => [
        setting.platform,
        {
          enabled: setting.enabled,
          model: setting.model,
          displayOrder: setting.display_order,
        },
      ]));
      
      setPlatforms(prev => prev.map(platform => {
        const savedSetting = settingsMap.get(platform.id);

        return {
          ...platform,
          enabled: settingsMap.has(platform.id) ? Boolean(savedSetting?.enabled) : true,
          selectedModel: resolvePlatformModel(platform.id, savedSetting?.model),
          displayOrder: savedSetting?.displayOrder ?? platform.displayOrder,
          hasApiKey: true,
        };
      }));
    } catch (error: any) {
      console.error('Failed to load agent settings:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [user]);

  const reloadSettings = useCallback(async () => {
    lastUserIdRef.current = null;
    await loadAgentSettings();
  }, [loadAgentSettings]);

  const saveAgentSetting = useCallback(async (platformId: string, enabled: boolean, model?: string, displayOrder?: number) => {
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
        updateData.model = resolvePlatformModel(platformId, model);
      }

      if (displayOrder !== undefined) {
        updateData.display_order = displayOrder;
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
  }, [user]);

  const updateAgentOrder = useCallback(async (reorderedPlatforms: AIPlatform[]) => {
    console.log('Updating agent order:', reorderedPlatforms.map(p => p.name));
    
    setPlatforms(prev => {
      const newPlatforms = [...prev];
      reorderedPlatforms.forEach((platform, index) => {
        const platformIndex = newPlatforms.findIndex(p => p.id === platform.id);
        if (platformIndex !== -1) {
          newPlatforms[platformIndex] = { ...newPlatforms[platformIndex], displayOrder: index + 1 };
        }
      });
      return newPlatforms.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    });

    try {
      const promises = reorderedPlatforms.map((platform, index) => 
        saveAgentSetting(platform.id, platform.enabled, platform.selectedModel, index + 1)
      );
      
      await Promise.all(promises);
      toast.success('Agent order updated');
    } catch (error) {
      console.error('Failed to save agent order:', error);
      toast.error('Failed to save agent order');
      await loadAgentSettings();
    }
  }, [saveAgentSetting, loadAgentSettings]);

  const togglePlatform = useCallback(async (platformId: string) => {
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

    await saveAgentSetting(platformId, newEnabled, platform.selectedModel, platform.displayOrder);
    console.log('Platform toggle saved to database');
  }, [platforms, saveAgentSetting]);

  const buildConversationForPlatform = (
    messages: Message[], 
    platformId: string, 
    enabledPlatforms: AIPlatform[],
    chatMode: ChatMode = 'discussion'
  ): Array<{role: 'user' | 'assistant', content: string}> => {
    const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
    
    const recentMessages = messages.slice(-15);
    
    recentMessages.forEach(message => {
      if (message.sender === 'user') {
        conversationHistory.push({ 
          role: 'user', 
          content: message.content 
        });
      } else if (message.sender === 'ai') {
        if (chatMode === 'isolated' || chatMode === 'side-by-side') {
          if (message.platform !== platformId) {
            return;
          }
          conversationHistory.push({ 
            role: 'assistant', 
            content: message.content 
          });
        } else {
          if (message.platform === platformId) {
            console.log(`Skipping ${platformId}'s own message:`, message.content.substring(0, 50));
            return;
          }
          
          if (message.platform && message.platform !== platformId) {
            const otherPlatform = enabledPlatforms.find(p => p.id === message.platform);
            const platformName = otherPlatform?.name || message.platform;
            conversationHistory.push({ 
              role: 'user', 
              content: `[${platformName} responded]: ${message.content}` 
            });
          }
        }
      }
    });
    
    console.log(`Built conversation for ${platformId} in ${chatMode} mode with ${conversationHistory.length} messages`);
    return conversationHistory;
  };

  const callAIAPI = async (
    platform: AIPlatform, 
    messages: Message[], 
    enabledPlatforms: AIPlatform[],
    chatMode: ChatMode = 'discussion'
  ): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const conversationHistory = buildConversationForPlatform(messages, platform.id, enabledPlatforms, chatMode);
    
    let contextMessage = '';
    
    const conciseness = `Be concise and direct. Keep responses under 150 words unless the topic genuinely requires more depth. No filler, no preamble. Short paragraphs.`;
    
    if (chatMode === 'isolated' || chatMode === 'side-by-side') {
      contextMessage = `You are ${platform.name} in a multi-AI chat app. The user may be comparing your response with other AI agents. ${conciseness}`;
    } else {
      const otherAIs = enabledPlatforms.filter(p => p.id !== platform.id && p.enabled && p.hasApiKey);
      if (otherAIs.length > 0) {
        contextMessage = `You are ${platform.name} in a multi-AI chat alongside ${otherAIs.map(p => p.name).join(', ')}. ${conciseness}

Messages from other agents appear as [Agent Name responded]. Add your unique perspective — don't repeat what others said. If you disagree, explain briefly. Do not reference your own previous responses.`;
      } else {
        contextMessage = `You are ${platform.name}. ${conciseness}`;
      }
    }
    
    conversationHistory.unshift({ role: 'user', content: contextMessage });

    const selectedModel = resolvePlatformModel(platform.id, platform.selectedModel);

    console.log(`Calling ${platform.name} API in ${chatMode} mode with ${conversationHistory.length} messages and model: ${selectedModel}`);
    
    switch (platform.id) {
      case 'anthropic':
        return await callClaudeAPI(conversationHistory, selectedModel);
      case 'openai':
        return await callOpenAI(conversationHistory, user, selectedModel);
      case 'deepseek':
        return await callDeepSeek(conversationHistory, user, selectedModel);
      case 'grok':
        return await callGrokAPI(conversationHistory, user, selectedModel);
      case 'google':
        return await callGeminiAPI(conversationHistory, user, selectedModel);
      default:
        throw new Error(`Unsupported platform: ${platform.id}`);
    }
  };

  useEffect(() => {
    loadAgentSettings();
  }, [loadAgentSettings]);

  return {
    platforms,
    setPlatforms,
    togglePlatform,
    callAIAPI,
    reloadSettings,
    updateAgentOrder
  };
};