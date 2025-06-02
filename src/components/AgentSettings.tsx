
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Save } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { getDefaultModel } from '@/config/aiModels';

interface AgentSetting {
  platform: string;
  model: string;
  enabled: boolean;
}

const AgentSettings = () => {
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const platforms = [
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🎭' },
    { id: 'openai', name: 'ChatGPT (OpenAI)', icon: '🤖' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔍' },
    { id: 'grok', name: 'Grok (X.AI)', icon: '🚀' },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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
        modelsMap[setting.platform] = setting.model || getDefaultModel(setting.platform);
        enabledMap[setting.platform] = setting.enabled;
      });

      // Set defaults for platforms without settings
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
    } catch (error: any) {
      console.error('Failed to load agent settings:', error);
      toast.error('Failed to load agent settings: ' + error.message);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save all platform settings
      const promises = platforms.map(platform => {
        return supabase
          .from('user_agent_settings')
          .upsert({
            user_id: user.id,
            platform: platform.id,
            model: selectedModels[platform.id] || getDefaultModel(platform.id),
            enabled: enabledPlatforms[platform.id] || false,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,platform'
          });
      });

      const results = await Promise.all(promises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Errors saving agent settings:', errors);
        throw new Error('Failed to save some settings');
      }

      toast.success('Agent settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save agent settings:', error);
      toast.error('Failed to save agent settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (platform: string, model: string) => {
    setSelectedModels(prev => ({ ...prev, [platform]: model }));
  };

  const handleToggleEnabled = (platform: string, enabled: boolean) => {
    setEnabledPlatforms(prev => ({ ...prev, [platform]: enabled }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h2 className="text-2xl font-bold">Agent Model Settings</h2>
        </div>
        <Button onClick={saveSettings} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
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
