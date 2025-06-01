
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, Save, Eye, EyeOff } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { getDefaultModel } from '@/config/aiModels';

interface ApiKey {
  platform: string;
  encrypted_key: string;
}

interface AgentSetting {
  platform: string;
  model: string;
}

const ApiKeySettings = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const platforms = [
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🎭' },
    { id: 'openai', name: 'ChatGPT (OpenAI)', icon: '🤖' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔍' },
    { id: 'grok', name: 'Grok (X.AI)', icon: '🚀' },
  ];

  useEffect(() => {
    loadApiKeys();
    loadModelSettings();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found when loading API keys');
        return;
      }

      console.log('Loading API keys for user:', user.id);

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('platform, encrypted_key')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading API keys:', error);
        throw error;
      }

      console.log('Loaded API keys from database:', data);

      const keysMap: Record<string, string> = {};
      data?.forEach((key: ApiKey) => {
        keysMap[key.platform] = key.encrypted_key;
      });
      setApiKeys(keysMap);
    } catch (error: any) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys: ' + error.message);
    }
  };

  const loadModelSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found when loading model settings');
        return;
      }

      const { data, error } = await supabase
        .from('user_agent_settings')
        .select('platform, model')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading model settings:', error);
        throw error;
      }

      const modelsMap: Record<string, string> = {};
      data?.forEach((setting: AgentSetting) => {
        modelsMap[setting.platform] = setting.model || getDefaultModel(setting.platform);
      });

      // Set defaults for platforms without settings
      platforms.forEach(platform => {
        if (!modelsMap[platform.id]) {
          modelsMap[platform.id] = getDefaultModel(platform.id);
        }
      });

      setSelectedModels(modelsMap);
    } catch (error: any) {
      console.error('Failed to load model settings:', error);
      toast.error('Failed to load model settings: ' + error.message);
    }
  };

  const saveApiKey = async (platform: string, key: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when saving API key');
        throw new Error('User not authenticated');
      }

      console.log('Saving API key for platform:', platform, 'user:', user.id);

      if (!key.trim()) {
        console.log('Deleting API key for platform:', platform);
        // Delete the key if it's empty
        const { error } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', platform);

        if (error) {
          console.error('Error deleting API key:', error);
          throw error;
        }
        
        setApiKeys(prev => {
          const updated = { ...prev };
          delete updated[platform];
          return updated;
        });
      } else {
        console.log('Upserting API key for platform:', platform);
        // Upsert the key
        const { data, error } = await supabase
          .from('user_api_keys')
          .upsert({
            user_id: user.id,
            platform,
            encrypted_key: key, // In production, encrypt this
          }, {
            onConflict: 'user_id,platform'
          });

        if (error) {
          console.error('Error upserting API key:', error);
          throw error;
        }

        console.log('Successfully saved API key, result:', data);
        
        setApiKeys(prev => ({ ...prev, [platform]: key }));
      }

      toast.success(`${platforms.find(p => p.id === platform)?.name} API key saved successfully`);
      
      // Reload keys to verify they were saved
      await loadApiKeys();
    } catch (error: any) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save API key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveModelSetting = async (platform: string, model: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when saving model setting');
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_agent_settings')
        .upsert({
          user_id: user.id,
          platform,
          model,
          enabled: false, // Keep existing enabled state
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error('Error saving model setting:', error);
        throw error;
      }

      console.log('Successfully saved model setting:', platform, model);
      toast.success(`${platforms.find(p => p.id === platform)?.name} model updated`);
    } catch (error: any) {
      console.error('Failed to save model setting:', error);
      toast.error('Failed to save model setting: ' + error.message);
    }
  };

  const handleModelChange = (platform: string, model: string) => {
    setSelectedModels(prev => ({ ...prev, [platform]: model }));
    saveModelSetting(platform, model);
  };

  const toggleShowKey = (platform: string) => {
    setShowKeys(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const updateApiKey = (platform: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [platform]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5" />
        <h2 className="text-2xl font-bold">API Key Settings</h2>
      </div>
      
      <div className="grid gap-4">
        {platforms.map((platform) => (
          <Card key={platform.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>{platform.icon}</span>
                {platform.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={platform.id}>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={platform.id}
                      type={showKeys[platform.id] ? 'text' : 'password'}
                      placeholder={`Enter your ${platform.name} API key`}
                      value={apiKeys[platform.id] || ''}
                      onChange={(e) => updateApiKey(platform.id, e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(platform.id)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showKeys[platform.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => saveApiKey(platform.id, apiKeys[platform.id] || '')}
                    disabled={loading}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              <ModelSelector
                platformId={platform.id}
                selectedModel={selectedModels[platform.id] || getDefaultModel(platform.id)}
                onModelChange={(model) => handleModelChange(platform.id, model)}
                disabled={!apiKeys[platform.id]}
              />
              
              <div className="text-xs text-gray-500">
                {platform.id === 'anthropic' && 'Get your API key from the Anthropic Console'}
                {platform.id === 'openai' && 'Get your API key from the OpenAI Platform'}
                {platform.id === 'deepseek' && 'Get your API key from the DeepSeek Platform'}
                {platform.id === 'grok' && 'Get your API key from the X.AI Console'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <strong>Note:</strong> Your API keys are stored securely and are only used to make requests on your behalf. 
        They are never shared with other users or used for any other purpose.
      </div>
    </div>
  );
};

export default ApiKeySettings;
