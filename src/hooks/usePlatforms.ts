import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message, ChatMode } from '@/types/chat';
import { callOpenAI, callDeepSeek, callClaudeAPI, callGrokAPI, callGeminiAPI, callMistralAPI, callPerplexityAPI, callQwenAPI, callNvidiaAPI, callLocalAPI } from '@/services/aiApiService';
import { getDefaultModel, getModelConfig, modelSupports } from '@/config/aiModels';
import { setActiveAgentModels } from '@/lib/capabilities';

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
    {
      id: 'qwen',
      name: 'Qwen',
      enabled: true,
      color: 'bg-agent-qwen border-agent-qwen text-cyber-bg',
      icon: '🐉',
      hasApiKey: true,
      selectedModel: getDefaultModel('qwen'),
      displayOrder: 8
    },
    {
      id: 'nvidia',
      name: 'NVIDIA',
      enabled: false,
      color: 'bg-agent-nvidia border-agent-nvidia text-cyber-bg',
      icon: '🟢',
      hasApiKey: true,
      selectedModel: getDefaultModel('nvidia'),
      displayOrder: 9
    },
    {
      // Local models served by LM Studio / Ollama on this machine (via the
      // local-chat edge function). Hidden from the agent bar until a model is
      // picked through the "+" menu; selectedModel = "<provider>::<model-id>".
      id: 'local',
      name: 'Local',
      enabled: false,
      color: 'bg-zinc-600 border-zinc-600 text-white',
      icon: '💻',
      hasApiKey: true,
      selectedModel: '',
      displayOrder: 10
    },
  ]);

  const loadingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const globalSystemPromptRef = useRef<string>('');
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

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

    // Transient failures must NOT be cached as "loaded": that leaves the default
    // all-enabled platforms in memory and disabled agents keep firing until a
    // full reload. Only a successful, session-backed load marks the user done.
    const scheduleRetry = () => {
      if (retryCountRef.current >= 5) {
        console.error('Giving up on agent settings after 5 attempts — defaults remain active');
        return;
      }
      retryCountRef.current += 1;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => { loadAgentSettings(); }, 1200);
    };

    loadingRef.current = true;

    try {
      // Under RLS an unauthenticated request returns ZERO rows, which would be
      // indistinguishable from "user never saved settings". Make sure the auth
      // session is actually attached before trusting the query result.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('Auth session not ready — retrying agent settings load');
        scheduleRetry();
        return;
      }

      const [{ data: settings, error }, { data: profile }] = await Promise.all([
        supabase
          .from('user_agent_settings')
          .select('platform, enabled, model, display_order, custom_instructions')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('custom_system_prompt')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      globalSystemPromptRef.current = (profile as any)?.custom_system_prompt || '';

      if (error) {
        console.error('Error loading agent settings, will retry:', error);
        scheduleRetry();
        return;
      }

      if (!settings || settings.length === 0) {
        // Session verified + query succeeded → genuinely a new user with no
        // saved settings; defaults (all enabled) are correct. Mark as loaded.
        console.log('No agent settings found for user, keeping defaults (all enabled)');
        lastUserIdRef.current = user.id;
        retryCountRef.current = 0;
        return;
      }

      const settingsMap = new Map((settings || []).map((setting: any) => [
        setting.platform,
        {
          enabled: setting.enabled,
          model: setting.model,
          displayOrder: setting.display_order,
          customInstructions: setting.custom_instructions || '',
        },
      ]));
      
      setPlatforms(prev => prev.map(platform => {
        const savedSetting = settingsMap.get(platform.id);

        return {
          ...platform,
          // Cloud agents default to enabled when no row exists; the local agent
          // stays hidden/disabled until explicitly configured via the "+" menu.
          enabled: settingsMap.has(platform.id) ? Boolean(savedSetting?.enabled) : platform.id !== 'local',
          // Local model ids are dynamic ("provider::model") — not in aiModels
          // config, so bypass resolvePlatformModel for them.
          selectedModel: platform.id === 'local'
            ? (savedSetting?.model ?? platform.selectedModel)
            : resolvePlatformModel(platform.id, savedSetting?.model),
          displayOrder: savedSetting?.displayOrder ?? platform.displayOrder,
          customInstructions: savedSetting?.customInstructions ?? '',
          hasApiKey: true,
        };
      }));

      lastUserIdRef.current = user.id;
      retryCountRef.current = 0;

    } catch (error: any) {
      console.error('Failed to load agent settings, will retry:', error);
      scheduleRetry();
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
        // Local model ids ("direct::<base>::<model>", "lmstudio::<model>") are
        // dynamic and not in the AI_MODELS catalog — resolvePlatformModel would
        // "correct" them to '' and silently wipe the selection. Store raw.
        updateData.model = platformId === 'local' ? model : resolvePlatformModel(platformId, model);
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

  // Configure the "Local" agent with a model picked from the "+" menu
  // (model = "<provider>::<model-id>"); null removes the agent.
  // NOTE: must be declared after saveAgentSetting (dependency array evaluates
  // at hook execution — referencing it earlier is a TDZ crash).
  const selectLocalModel = useCallback(async (model: string | null) => {
    const local = platforms.find(p => p.id === 'local');
    if (!local) return;

    const enabled = !!model;
    const selectedModel = model ?? '';

    setPlatforms(prev => prev.map(p =>
      p.id === 'local' ? { ...p, enabled, selectedModel } : p
    ));
    await saveAgentSetting('local', enabled, selectedModel, local.displayOrder);
  }, [platforms, saveAgentSetting]);

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

    // The Local agent is unusable without a model — route users to the "+" menu
    // instead of enabling a dead agent.
    if (platform.id === 'local' && newEnabled && !platform.selectedModel) {
      toast.info('Pick a local model first — use the "+" button in the agent bar');
      return;
    }
    
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

    // Wider history window; older context is covered by RAG via shared-context.
    const recentMessages = messages.slice(-30);
    
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
- Multi-AI text chat with 8 frontier models (OpenAI ChatGPT, Anthropic Claude, Google Gemini, xAI Grok, DeepSeek, Mistral, Perplexity, and Alibaba Qwen).
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
    const userOverrides = [
      globalSystemPromptRef.current?.trim() ? `User's global instructions (highest priority — follow these):\n${globalSystemPromptRef.current.trim()}` : '',
      platform.customInstructions?.trim() ? `User's instructions specifically for ${platform.name} (highest priority — follow these):\n${platform.customInstructions.trim()}` : '',
    ].filter(Boolean).join('\n\n');

    if (userOverrides) {
      contextMessage += `\n\n${userOverrides}`;
    }

    // Shared context across all of the user's chats (memory + RAG).
    // Best-effort: failures must never block the AI call.
    const conversationId = messages[messages.length - 1]?.conversation_id;
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user')?.content || '';
    if (!isFreeMode && lastUserMsg && conversationId) {
      try {
        const { data: ctxData } = await supabase.functions.invoke('shared-context', {
          body: { query: lastUserMsg, conversation_id: conversationId, match_count: 6 },
        });
        const block: string = ctxData?.block || '';
        if (block) {
          contextMessage += `\n\n${block}`;
        }
      } catch (e) {
        console.warn('shared-context fetch failed (continuing without it):', e);
      }
    }

    conversationHistory.unshift({ role: 'user', content: contextMessage });


    const selectedModel = resolvePlatformModel(platform.id, platform.selectedModel);

    // Extract attachments from the latest user message — pass them through to
    // the provider edge function only if the selected model can actually
    // consume them. For text-only models we silently drop, matching the
    // "skip unsupported attachments" plan.
    const lastUserMsgObj = [...messages].reverse().find(m => m.sender === 'user');
    const rawAttachments = lastUserMsgObj?.attachments && lastUserMsgObj.attachments.length > 0
      ? lastUserMsgObj.attachments
      : undefined;
    const attachments = rawAttachments && modelSupports(selectedModel, 'vision')
      ? rawAttachments
      : undefined;

    console.log(`Calling ${platform.name} API in ${chatMode} mode with ${conversationHistory.length} messages and model: ${selectedModel}${attachments ? ` (+${attachments.length} attachments)` : ''}`);

    // Resolve advanced capabilities (think/search/deep_research/code_exec)
    // from per-message overrides + per-agent defaults + conductor overrides.
    const { resolveCapabilitiesForPlatform } = await import('@/lib/capabilities');
    const advancedCaps = resolveCapabilitiesForPlatform(platform.id, selectedModel);
    if (Object.values(advancedCaps).some(Boolean)) {
      console.log(`[${platform.name}] advanced capabilities:`, advancedCaps);
    }

    switch (platform.id) {
      case 'anthropic':
        return await callClaudeAPI(conversationHistory, selectedModel, attachments, advancedCaps);
      case 'openai':
        return await callOpenAI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'deepseek':
        return await callDeepSeek(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'grok':
        return await callGrokAPI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'google':
        return await callGeminiAPI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'mistral':
        return await callMistralAPI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'perplexity':
        return await callPerplexityAPI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'qwen':
        return await callQwenAPI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'nvidia':
        return await callNvidiaAPI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      case 'local':
        if (!selectedModel) {
          throw new Error('No local model selected — pick one from the "+" menu in the agent bar');
        }
        return await callLocalAPI(conversationHistory, user, selectedModel, attachments, advancedCaps);
      default:
        throw new Error(`Unsupported platform: ${platform.id}`);
    }
  };

  useEffect(() => {
    loadAgentSettings();
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [loadAgentSettings]);

  // Keep the shared capability registry aware of each agent's selected model so
  // the UI can grey out capabilities the chosen model can't actually do.
  useEffect(() => {
    const map: Record<string, string> = {};
    platforms.forEach(p => {
      if (p.enabled && p.selectedModel) map[p.id] = p.selectedModel;
    });
    setActiveAgentModels(map);
  }, [platforms]);


  return {
    platforms,
    setPlatforms,
    togglePlatform,
    callAIAPI,
    reloadSettings,
    updateAgentOrder,
    selectLocalModel
  };
};