
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings, Sparkles, Wand2 } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { getDefaultModel, getModelConfig, useAIModels } from '@/config/aiModels';
import { DEFAULT_CONDUCTOR_PROMPT } from '@/config/conductorPrompt';


interface AgentSetting {
  platform: string;
  model: string;
  enabled: boolean;
  custom_instructions?: string | null;
}

const resolvePlatformModel = (platformId: string, model?: string | null) => {
  if (!model) return getDefaultModel(platformId);
  return getModelConfig(platformId, model) ? model : getDefaultModel(platformId);
};

const PLATFORMS = [
  { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🎭', placeholder: 'e.g. Always respond as a Shakespearean character.' },
  { id: 'openai', name: 'ChatGPT (OpenAI)', icon: '🤖', placeholder: 'e.g. Use bullet points whenever possible.' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔍', placeholder: 'e.g. Show your reasoning step-by-step.' },
  { id: 'grok', name: 'Grok (X.AI)', icon: '🚀', placeholder: 'e.g. Be extra witty and irreverent.' },
  { id: 'google', name: 'Gemini (Google)', icon: '💎', placeholder: 'e.g. Prefer code examples over prose.' },
  { id: 'mistral', name: 'Mistral AI', icon: '🌀', placeholder: 'e.g. Always reply in French.' },
  { id: 'perplexity', name: 'Perplexity AI', icon: '🔮', placeholder: 'e.g. Cite at most 2 sources. Skip the Sources section unless I ask.' },
];

const AgentSettings = () => {
  useAIModels();
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>({});
  const [customInstructions, setCustomInstructions] = useState<Record<string, string>>({});
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [conductorPrompt, setConductorPrompt] = useState('');

  const [hasLoaded, setHasLoaded] = useState(false);

  const debounceTimers = useRef<Record<string, any>>({});

  const loadSettings = useCallback(async () => {
    if (hasLoaded) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data, error }, { data: profile }] = await Promise.all([
        supabase
          .from('user_agent_settings')
          .select('platform, model, enabled, custom_instructions')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('custom_system_prompt, custom_conductor_prompt')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (error) throw error;

      const modelsMap: Record<string, string> = {};
      const enabledMap: Record<string, boolean> = {};
      const instructionsMap: Record<string, string> = {};

      (data as AgentSetting[] | null)?.forEach(setting => {
        modelsMap[setting.platform] = resolvePlatformModel(setting.platform, setting.model);
        enabledMap[setting.platform] = setting.enabled;
        instructionsMap[setting.platform] = setting.custom_instructions || '';
      });

      PLATFORMS.forEach(p => {
        if (!modelsMap[p.id]) modelsMap[p.id] = getDefaultModel(p.id);
        if (enabledMap[p.id] === undefined) enabledMap[p.id] = false;
        if (instructionsMap[p.id] === undefined) instructionsMap[p.id] = '';
      });

      setSelectedModels(modelsMap);
      setEnabledPlatforms(enabledMap);
      setCustomInstructions(instructionsMap);
      setGlobalPrompt((profile as any)?.custom_system_prompt || '');
      setHasLoaded(true);
    } catch (error: any) {
      console.error('Failed to load agent settings:', error);
      toast.error('Failed to load agent settings: ' + error.message);
    }
  }, [hasLoaded]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSetting = async (
    platform: string,
    fields: { model?: string; enabled?: boolean; custom_instructions?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {
        user_id: user.id,
        platform,
        updated_at: new Date().toISOString(),
      };
      if (fields.model !== undefined) updateData.model = resolvePlatformModel(platform, fields.model);
      if (fields.enabled !== undefined) updateData.enabled = fields.enabled;
      if (fields.custom_instructions !== undefined) updateData.custom_instructions = fields.custom_instructions;

      const { error } = await supabase
        .from('user_agent_settings')
        .upsert(updateData, { onConflict: 'user_id,platform' });

      if (error) throw error;
      toast.success('Saved');
    } catch (error: any) {
      console.error('Failed to save:', error);
      toast.error('Failed to save: ' + error.message);
    }
  };

  const handleModelChange = useCallback((platform: string, model: string) => {
    setSelectedModels(prev => ({ ...prev, [platform]: resolvePlatformModel(platform, model) }));
    saveSetting(platform, { model });
  }, []);

  const handleToggleEnabled = useCallback((platform: string, enabled: boolean) => {
    setEnabledPlatforms(prev => ({ ...prev, [platform]: enabled }));
    saveSetting(platform, { enabled });
  }, []);

  const handleInstructionsChange = useCallback((platform: string, value: string) => {
    setCustomInstructions(prev => ({ ...prev, [platform]: value }));
    if (debounceTimers.current[platform]) clearTimeout(debounceTimers.current[platform]);
    debounceTimers.current[platform] = setTimeout(() => {
      saveSetting(platform, { custom_instructions: value });
    }, 800);
  }, []);

  const handleGlobalPromptChange = useCallback((value: string) => {
    setGlobalPrompt(value);
    if (debounceTimers.current['__global__']) clearTimeout(debounceTimers.current['__global__']);
    debounceTimers.current['__global__'] = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase
          .from('profiles')
          .update({ custom_system_prompt: value })
          .eq('id', user.id);
        if (error) throw error;
        toast.success('Global prompt saved');
      } catch (error: any) {
        toast.error('Failed to save: ' + error.message);
      }
    }, 800);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        <h2 className="text-2xl font-bold">Agent Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5" />
            Global System Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="global-prompt" className="text-sm text-muted-foreground">
            Applies to every agent in every chat. Use it to set tone, persona, language, or rules.
          </Label>
          <Textarea
            id="global-prompt"
            value={globalPrompt}
            onChange={(e) => handleGlobalPromptChange(e.target.value)}
            placeholder="e.g. Always reply in Spanish. Be brutally honest. Skip disclaimers."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {PLATFORMS.map((platform) => (
          <Card key={platform.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>{platform.icon}</span>
                {platform.name}
                <div className="ml-auto flex items-center gap-3">
                  <Label htmlFor={`enable-${platform.id}`} className="text-sm">
                    {enabledPlatforms[platform.id] ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id={`enable-${platform.id}`}
                    checked={enabledPlatforms[platform.id] || false}
                    onCheckedChange={(checked) => handleToggleEnabled(platform.id, checked)}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModelSelector
                platformId={platform.id}
                selectedModel={selectedModels[platform.id] || getDefaultModel(platform.id)}
                onModelChange={(model) => handleModelChange(platform.id, model)}
                disabled={!enabledPlatforms[platform.id]}
              />
              <div className="space-y-2">
                <Label htmlFor={`instructions-${platform.id}`} className="text-sm text-muted-foreground">
                  Custom instructions for {platform.name}
                </Label>
                <Textarea
                  id={`instructions-${platform.id}`}
                  value={customInstructions[platform.id] || ''}
                  onChange={(e) => handleInstructionsChange(platform.id, e.target.value)}
                  placeholder={platform.placeholder}
                  rows={3}
                  disabled={!enabledPlatforms[platform.id]}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
        <strong>Note:</strong> Everything auto-saves. Global prompt applies to all agents; per-agent instructions stack on top of it.
      </div>
    </div>
  );
};

export default AgentSettings;
