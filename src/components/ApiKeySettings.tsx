
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Key, Save, Trash2 } from 'lucide-react';

interface ApiKey {
  platform: string;
  hasKey: boolean;
}

const ApiKeySettings = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [existingKeys, setExistingKeys] = useState<ApiKey[]>([]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const platforms = [
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
    { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
    { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
    { id: 'grok', name: 'Grok (X.AI)', placeholder: 'xai-...' },
  ];

  useEffect(() => {
    loadExistingKeys();
  }, []);

  const loadExistingKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('platform')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading existing keys:', error);
        return;
      }

      const keys: ApiKey[] = platforms.map(platform => ({
        platform: platform.id,
        hasKey: data?.some(key => key.platform === platform.id) || false
      }));

      setExistingKeys(keys);
    } catch (error: any) {
      console.error('Failed to load existing keys:', error);
    }
  };

  const saveApiKey = async (platform: string) => {
    const apiKey = apiKeys[platform];
    if (!apiKey || !apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setSavingKey(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use the secure encryption function
      const response = await supabase.functions.invoke('encrypt-api-key', {
        body: { 
          platform,
          api_key: apiKey
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to save API key');
      }

      // Clear the input and update existing keys
      setApiKeys(prev => ({ ...prev, [platform]: '' }));
      setShowKeys(prev => ({ ...prev, [platform]: false }));
      await loadExistingKeys();
      
      toast.success(`${platforms.find(p => p.id === platform)?.name} API key saved securely`);
    } catch (error: any) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save API key: ' + error.message);
    } finally {
      setSavingKey(null);
    }
  };

  const deleteApiKey = async (platform: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', platform);

      if (error) {
        throw new Error(error.message);
      }

      await loadExistingKeys();
      toast.success(`${platforms.find(p => p.id === platform)?.name} API key deleted`);
    } catch (error: any) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowKey = (platform: string) => {
    setShowKeys(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleKeyChange = (platform: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [platform]: value }));
  };

  const hasExistingKey = (platform: string) => {
    return existingKeys.find(key => key.platform === platform)?.hasKey || false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5" />
        <h2 className="text-2xl font-bold">API Key Management</h2>
      </div>
      
      <div className="grid gap-4">
        {platforms.map((platform) => (
          <Card key={platform.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                {platform.name}
                {hasExistingKey(platform.id) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                      ✓ Configured
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteApiKey(platform.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${platform.id}-key`}>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={`${platform.id}-key`}
                      type={showKeys[platform.id] ? 'text' : 'password'}
                      placeholder={platform.placeholder}
                      value={apiKeys[platform.id] || ''}
                      onChange={(e) => handleKeyChange(platform.id, e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleShowKey(platform.id)}
                    >
                      {showKeys[platform.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => saveApiKey(platform.id)}
                    disabled={!apiKeys[platform.id] || savingKey === platform.id}
                    className="min-w-[100px]"
                  >
                    {savingKey === platform.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <strong>Security Notice:</strong> Your API keys are encrypted using industry-standard encryption before being stored in the database. 
        They are only decrypted when needed to make API calls on your behalf. Never share your API keys with anyone.
      </div>
    </div>
  );
};

export default ApiKeySettings;
