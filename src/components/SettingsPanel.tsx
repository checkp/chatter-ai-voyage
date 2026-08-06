
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TokenPurchase from './TokenPurchase';
import TokenHistory from './TokenHistory';
import AgentSettings from './AgentSettings';
import AdminPanel from './AdminPanel';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SettingsPanel = () => {
  const { user } = useAuth();

  // Check if user is admin
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userProfile?.is_admin === true;
  const showAdminTab = isAdmin;

  // Determine grid columns based on whether admin tab is shown
  const gridCols = showAdminTab ? 'grid-cols-5' : 'grid-cols-4';


  if (isLoadingProfile) {
    return (
      <div className="max-w-6xl mx-auto p-6 settings-panel">
        <div className="flex items-center justify-center py-8">
          <div className="text-center modern-text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 settings-panel">
      <Tabs defaultValue="tokens" className="w-full">
        <TabsList className={`grid w-full ${gridCols} modern-bg-surface modern-border`}>
          <TabsTrigger value="tokens" className="modern-text-primary">Buy Tokens</TabsTrigger>
          <TabsTrigger value="history" className="modern-text-primary">Usage History</TabsTrigger>
          <TabsTrigger value="agents" className="modern-text-primary">Agent Models</TabsTrigger>
          {showAdminTab && <TabsTrigger value="admin" className="modern-text-primary">Admin</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="tokens" className="mt-6">
          {user && <TokenPurchase user={user} />}
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          {user && <TokenHistory user={user} />}
        </TabsContent>
        
        <TabsContent value="agents" className="mt-6">
          <AgentSettings />
        </TabsContent>

        {showAdminTab && (
          <TabsContent value="admin" className="mt-6">
            {user && <AdminPanel user={user} />}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
