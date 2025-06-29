
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import AdminStatsCards from './admin/AdminStatsCards';
import AdminUsersTable from './admin/AdminUsersTable';
import AdminApiKeys from './admin/AdminApiKeys';
import AdminPlatformUsage from './admin/AdminPlatformUsage';

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
  balance: number;
  total_purchased: number;
  total_consumed: number;
  has_completed_onboarding: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
  const queryClient = useQueryClient();

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
  const { data: allUsers, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
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
          has_completed_onboarding
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch token data separately for each user
      const usersWithTokens = await Promise.all(
        data.map(async (profile) => {
          const { data: tokenData } = await supabase
            .from('user_tokens')
            .select('balance, total_purchased, total_consumed')
            .eq('user_id', profile.id)
            .single();

          return {
            ...profile,
            balance: tokenData?.balance || 0,
            total_purchased: tokenData?.total_purchased || 0,
            total_consumed: tokenData?.total_consumed || 0,
          };
        })
      );

      return usersWithTokens as UserWithTokens[];
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

  const toggleUserAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentIsAdmin })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User ${!currentIsAdmin ? 'promoted to' : 'removed from'} admin`);
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <AdminUsersTable
            users={allUsers || []}
            currentUser={user}
            isLoading={isLoadingUsers}
            onToggleAdmin={toggleUserAdmin}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <AdminStatsCards
            userCount={allUsers?.length || 0}
            tokenStats={tokenStats}
          />
          
          {tokenStats?.platformUsage && (
            <AdminPlatformUsage platformUsage={tokenStats.platformUsage} />
          )}
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <AdminApiKeys />
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
