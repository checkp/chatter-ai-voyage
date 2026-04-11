
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { getDefaultModel, getModelConfig } from '@/config/aiModels';

interface AgentSetting {
  platform: string;
  model: string;
  enabled: boolean;
}

const resolvePlatformModel = (platformId: string, model?: string | null) => {
  if (!model) {
    return getDefaultModel(platformId);
  }

  return getModelConfig(platformId, model) ? model : getDefaultModel(platformId);
};

const AgentSettings = () => {
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>({});
  
  const [hasLoaded, setHasLoaded] = useState(false);

  const platforms = [
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🎭' },
    { id: 'openai', name: 'ChatGPT (OpenAI)', icon: '🤖' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔍' },
    { id: 'grok', name: 'Grok (X.AI)', icon: '🚀' },
    { id: 'google', name: 'Gemini (Google)', icon: '💎' },
    { id: 'mistral', name: 'Mistral AI', icon: '🌀' },
    { id: 'perplexity', name: 'Perplexity AI', icon: '🔮' },
  ];

  const loadSettings = useCallback(async () => {
    if (hasLoaded) {
      console.log('Settings already loaded, skipping');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_agent_settings')
        .select('platform, model, enabled')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading agent settings:', error);
        throw error;
      }

      const modelsMap: Record<string, string> = {};
      const enabledMap: Record<string, boolean> = {};
      
      data?.forEach((setting: AgentSetting) => {
        modelsMap[setting.platform] = resolvePlatformModel(setting.platform, setting.model);
        enabledMap[setting.platform] = setting.enabled;
      });

      platforms.forEach(platform => {
        if (!modelsMap[platform.id]) {
          modelsMap[platform.id] = getDefaultModel(platform.id);
        }
        if (enabledMap[platform.id] === undefined) {
          enabledMap[platform.id] = false;
        }
      });

      setSelectedModels(modelsMap);
      setEnabledPlatforms(enabledMap);
      setHasLoaded(true);
    } catch (error: any) {
      console.error('Failed to load agent settings:', error);
      toast.error('Failed to load agent settings: ' + error.message);
    }
  }, [hasLoaded]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSetting = async (platform: string, model?: string, enabled?: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        user_id: user.id,
        platform: platform,
        updated_at: new Date().toISOString()
      };

      if (model !== undefined) {
        updateData.model = resolvePlatformModel(platform, model);
      }
      if (enabled !== undefined) {
        updateData.enabled = enabled;
      }

      const { error } = await supabase
        .from('user_agent_settings')
        .upsert(updateData, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error('Error saving agent setting:', error);
        throw error;
      }

      toast.success('Setting saved');
    } catch (error: any) {
      console.error('Failed to save agent setting:', error);
      toast.error('Failed to save setting: ' + error.message);
    }
  };

  const handleModelChange = useCallback((platform: string, model: string) => {
    setSelectedModels(prev => ({ ...prev, [platform]: resolvePlatformModel(platform, model) }));
    saveSetting(platform, model);
  }, []);

  const handleToggleEnabled = useCallback((platform: string, enabled: boolean) => {
    setEnabledPlatforms(prev => ({ ...prev, [platform]: enabled }));
    saveSetting(platform, undefined, enabled);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        <h2 className="text-2xl font-bold">Agent Model Settings</h2>
      </div>
      
      <div className="grid gap-4">
        {platforms.map((platform) => (
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
            <CardContent>
              <ModelSelector
                platformId={platform.id}
                selectedModel={selectedModels[platform.id] || getDefaultModel(platform.id)}
                onModelChange={(model) => handleModelChange(platform.id, model)}
                disabled={!enabledPlatforms[platform.id]}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <strong>Note:</strong> These settings control which AI model each agent uses when responding. 
        You can enable/disable agents here and change models at any time.
      </div>
    </div>
  );
};

export default AgentSettings;