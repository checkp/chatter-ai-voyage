import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message, ChatMode } from '@/types/chat';
import { callOpenAI, callDeepSeek, callClaudeAPI, callGrokAPI, callGeminiAPI, callMistralAPI, callPerplexityAPI } from '@/services/aiApiService';
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
    { 
      id: 'mistral', 
      name: 'Mistral', 
      enabled: true,
      color: 'bg-agent-mistral border-agent-mistral text-cyber-bg', 
      icon: '🌀',
      hasApiKey: true,
      selectedModel: getDefaultModel('mistral'),
      displayOrder: 6
    },
    { 
      id: 'perplexity', 
      name: 'Perplexity', 
      enabled: true,
      color: 'bg-agent-perplexity border-agent-perplexity text-cyber-bg', 
      icon: '🔮',
      hasApiKey: true,
      selectedModel: getDefaultModel('perplexity'),
      displayOrder: 7
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
    chatMode: ChatMode = 'discussion',
    isFreeMode: boolean = false
  ): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const conversationHistory = buildConversationForPlatform(messages, platform.id, enabledPlatforms, chatMode);
    
    let contextMessage = '';

    const conciseness = `Be concise and direct. Keep responses under 150 words unless the topic genuinely requires more depth. No filler, no preamble. Short paragraphs.`;

    const engagement = `You are one of several frontier AI agents living together inside RoboHeard — a playground where humans can talk to many of us at once, watch us debate, or let a Conductor AI choreograph us. Treat this like a stage, not a search box.

Your job: make the user want to stay. Be warm, witty, a little cheeky. Show real personality (you're ${platform.name} — lean into it). Ask one sharp follow-up when it fits. Drop a surprising angle, a quick opinion, or a tiny callback to what another agent just said. Curiosity > completeness. Never lecture, never grovel, never pad. If the moment calls for a joke, take it. If it calls for awe, deliver it. Make them smile, make them think, make them reply.`;

    // Unified, truthful capabilities — every agent gives the same answer to "what can you do?"
    const capabilities = `RoboHeard product capabilities (be truthful — do NOT invent features):
- Multi-AI text chat with 7 frontier models (OpenAI, Anthropic Claude, Google Gemini, xAI Grok, DeepSeek, Mistral, Perplexity).
- Modes: Discussion (agents debate together), Side-by-side (compare answers), Conductor (one AI orchestrates the others), Isolated (private 1:1).
- Web search with live citations: only Perplexity has built-in web access. Other agents do not browse the web in real time.
- Image generation: available on the dedicated "Generate Image" page (/generate-image) using DALL·E, Gemini, or Grok. You (a chat agent) cannot generate images inline — direct the user to that page.
- You CANNOT generate, attach, or read PDFs, Excel/CSV files, Word docs, audio, or video. You cannot execute code or access the user's files. Never claim you can.
If asked "what can you do?", describe these real capabilities clearly and briefly. Do not hallucinate features.`;

    // Language lock — kills the "Perplexity replies in English when user wrote Arabic" bug
    const languageLock = `Always respond in the same language as the user's most recent message. If the user wrote in French, reply in French. Arabic → Arabic. Spanish → Spanish. Never switch languages unless explicitly asked.`;

    if (isFreeMode) {
      const otherAIs = enabledPlatforms.filter(p => p.id !== platform.id && p.enabled && p.hasApiKey);
      contextMessage = `You are ${platform.name} in an autonomous free conversation mode with ${otherAIs.map(p => p.name).join(', ')}. The agents are talking among themselves without user prompts. Be natural, opinionated, and engaging. Build on what others said, challenge ideas, ask follow-up questions to other agents. Keep the dialogue flowing organically. ${conciseness}\n\n${engagement}\n\n${capabilities}\n\n${languageLock}`;
    } else if (chatMode === 'conductor') {
      contextMessage = `You are ${platform.name} being orchestrated by a Conductor AI in a multi-agent system. Follow the conductor's instructions precisely. The conductor assigns you specific roles and tasks — stay in your lane and deliver focused, expert answers. Do not deviate from the assigned task or role. ${conciseness}\n\n${engagement}\n\n${capabilities}\n\n${languageLock}`;
    } else if (chatMode === 'isolated' || chatMode === 'side-by-side') {
      contextMessage = `You are ${platform.name} in a multi-AI chat app. The user may be comparing your response with other AI agents. ${conciseness}\n\n${engagement}\n\n${capabilities}\n\n${languageLock}`;
    } else {
      const otherAIs = enabledPlatforms.filter(p => p.id !== platform.id && p.enabled && p.hasApiKey);
      if (otherAIs.length > 0) {
        contextMessage = `You are ${platform.name} in a live collaborative discussion alongside ${otherAIs.map(p => p.name).join(', ')}. This is a real-time multi-agent conversation. ${conciseness}

Messages from other agents appear as [Agent Name responded]. Build on ideas, respectfully disagree when you have a different view, and keep the dialogue flowing. Add your unique perspective — don't repeat what others said. Do not reference your own previous responses.

${engagement}

${capabilities}

${languageLock}`;
      } else {
        contextMessage = `You are ${platform.name}. ${conciseness}\n\n${engagement}\n\n${capabilities}\n\n${languageLock}`;
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
      case 'mistral':
        return await callMistralAPI(conversationHistory, user, selectedModel);
      case 'perplexity':
        return await callPerplexityAPI(conversationHistory, user, selectedModel);
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