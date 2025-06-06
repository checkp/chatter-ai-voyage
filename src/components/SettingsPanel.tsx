
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TokenPurchase from './TokenPurchase';
import TokenHistory from './TokenHistory';
import AgentSettings from './AgentSettings';
import AdminPanel from './AdminPanel';
import ImageGeneration from './ImageGeneration';
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Tabs defaultValue="tokens" className="w-full">
        <TabsList className={`grid w-full ${gridCols}`}>
          <TabsTrigger value="tokens">Buy Tokens</TabsTrigger>
          <TabsTrigger value="images">Generate Images</TabsTrigger>
          <TabsTrigger value="history">Usage History</TabsTrigger>
          <TabsTrigger value="agents">Agent Models</TabsTrigger>
          {showAdminTab && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="tokens" className="mt-6">
          {user && <TokenPurchase user={user} />}
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          {user && <ImageGeneration user={user} />}
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
