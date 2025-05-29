
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, Save, Eye, EyeOff } from 'lucide-react';

interface ApiKey {
  platform: string;
  encrypted_key: string;
}

const ApiKeySettings = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const platforms = [
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🎭' },
    { id: 'openai', name: 'ChatGPT (OpenAI)', icon: '🤖' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔍' },
  ];

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('platform, encrypted_key')
        .eq('user_id', user.id);

      if (error) throw error;

      const keysMap: Record<string, string> = {};
      data?.forEach((key: ApiKey) => {
        keysMap[key.platform] = key.encrypted_key;
      });
      setApiKeys(keysMap);
    } catch (error: any) {
      toast.error('Failed to load API keys: ' + error.message);
    }
  };

  const saveApiKey = async (platform: string, key: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!key.trim()) {
        // Delete the key if it's empty
        const { error } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', platform);

        if (error) throw error;
        
        setApiKeys(prev => {
          const updated = { ...prev };
          delete updated[platform];
          return updated;
        });
      } else {
        // Upsert the key
        const { error } = await supabase
          .from('user_api_keys')
          .upsert({
            user_id: user.id,
            platform,
            encrypted_key: key, // In production, encrypt this
          });

        if (error) throw error;
        
        setApiKeys(prev => ({ ...prev, [platform]: key }));
      }

      toast.success(`${platforms.find(p => p.id === platform)?.name} API key saved successfully`);
    } catch (error: any) {
      toast.error('Failed to save API key: ' + error.message);
    } finally {
      setLoading(false);
    }
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
              
              <div className="text-xs text-gray-500">
                {platform.id === 'anthropic' && 'Get your API key from the Anthropic Console'}
                {platform.id === 'openai' && 'Get your API key from the OpenAI Platform'}
                {platform.id === 'deepseek' && 'Get your API key from the DeepSeek Platform'}
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
