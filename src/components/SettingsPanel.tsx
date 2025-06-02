
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TokenPurchase from './TokenPurchase';
import TokenHistory from './TokenHistory';
import AgentSettings from './AgentSettings';
import AdminPanel from './AdminPanel';
import { useAuth } from '@/hooks/useAuth';

const SettingsPanel = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Tabs defaultValue="tokens" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tokens">Buy Tokens</TabsTrigger>
          <TabsTrigger value="history">Usage History</TabsTrigger>
          <TabsTrigger value="agents">Agent Models</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
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

        <TabsContent value="admin" className="mt-6">
          {user && <AdminPanel user={user} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
