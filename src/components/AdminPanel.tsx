
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, DollarSign, Settings, Key } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AdminPanelProps {
  user: SupabaseUser;
}

interface TokenTransactionMetadata {
  price_cents?: number;
  platform?: string;
  model?: string;
  [key: string]: any;
}

interface UserWithTokens {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  user_tokens: Array<{
    balance: number;
    total_purchased: number;
    total_consumed: number;
  }>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');

  // Check if user is admin
  const { data: userProfile } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch all users for admin
  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          is_admin,
          created_at,
          user_tokens!inner(balance, total_purchased, total_consumed)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserWithTokens[];
    },
    enabled: userProfile?.is_admin === true,
  });

  // Fetch token statistics
  const { data: tokenStats } = useQuery({
    queryKey: ['admin-token-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_transactions')
        .select('transaction_type, amount, metadata')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const stats = {
        totalPurchased: 0,
        totalConsumed: 0,
        totalRevenue: 0,
        platformUsage: {} as Record<string, number>,
      };

      data.forEach(transaction => {
        if (transaction.transaction_type === 'purchase') {
          stats.totalPurchased += transaction.amount;
          const metadata = transaction.metadata as TokenTransactionMetadata;
          if (metadata?.price_cents) {
            stats.totalRevenue += metadata.price_cents;
          }
        } else if (transaction.transaction_type === 'consumption') {
          stats.totalConsumed += Math.abs(transaction.amount);
          const metadata = transaction.metadata as TokenTransactionMetadata;
          if (metadata?.platform) {
            stats.platformUsage[metadata.platform] = 
              (stats.platformUsage[metadata.platform] || 0) + Math.abs(transaction.amount);
          }
        }
      });

      return stats;
    },
    enabled: userProfile?.is_admin === true,
  });

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

  const toggleUserAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentIsAdmin })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User ${!currentIsAdmin ? 'promoted to' : 'removed from'} admin`);
      // Refresh users list
      // queryClient.invalidateQueries(['admin-users']);
    } catch (error: any) {
      console.error('Error updating user admin status:', error);
      toast.error('Failed to update user admin status');
    }
  };

  if (!userProfile?.is_admin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground">
              You need admin privileges to access this panel.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5" />
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <Badge variant="destructive">Admin Only</Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allUsers?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((tokenStats?.totalRevenue || 0) / 100).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens Sold</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(tokenStats?.totalPurchased || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(tokenStats?.totalConsumed || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Usage Chart */}
          {tokenStats?.platformUsage && Object.keys(tokenStats.platformUsage).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(tokenStats.platformUsage).map(([platform, usage]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <span className="capitalize">{platform}</span>
                      <Badge variant="outline">{usage.toLocaleString()} tokens</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {allUsers?.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.full_name || 'No name provided'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Balance: {user.user_tokens?.[0]?.balance || 0} tokens
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.is_admin ? "default" : "secondary"}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                System settings panel coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
