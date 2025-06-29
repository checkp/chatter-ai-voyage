
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminApiKeys: React.FC = () => {
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');

  const handleUpdateApiKey = async () => {
    if (!selectedApiKey || !apiKeyValue) {
      toast.error('Please select an API key type and enter a value');
      return;
    }

    try {
      const response = await supabase.functions.invoke('update-api-key', {
        body: { 
          key_name: selectedApiKey,
          key_value: apiKeyValue 
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('API key updated successfully');
      setApiKeyValue('');
    } catch (error: any) {
      console.error('Error updating API key:', error);
      toast.error('Failed to update API key: ' + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Centralized API Key Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key-type">API Key Type</Label>
          <select
            id="api-key-type"
            value={selectedApiKey}
            onChange={(e) => setSelectedApiKey(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select API Key Type</option>
            <option value="OPENAI_API_KEY">OpenAI API Key</option>
            <option value="ANTHROPIC_API_KEY">Anthropic API Key</option>
            <option value="DEEPSEEK_API_KEY">DeepSeek API Key</option>
            <option value="GROK_API_KEY">Grok (X.AI) API Key</option>
            <option value="STRIPE_SECRET_KEY">Stripe Secret Key</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api-key-value">API Key Value</Label>
          <Input
            id="api-key-value"
            type="password"
            value={apiKeyValue}
            onChange={(e) => setApiKeyValue(e.target.value)}
            placeholder="Enter the API key value"
          />
        </div>

        <Button onClick={handleUpdateApiKey} disabled={!selectedApiKey || !apiKeyValue}>
          Update API Key
        </Button>

        <div className="text-sm text-muted-foreground">
          <strong>Note:</strong> These centralized API keys are used for all users. 
          Users no longer manage their own API keys.
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminApiKeys;
