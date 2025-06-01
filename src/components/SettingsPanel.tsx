
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiKeySettings from './ApiKeySettings';
import AgentSettings from './AgentSettings';

const SettingsPanel = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="agent-models">Agent Models</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-keys" className="mt-6">
          <ApiKeySettings />
        </TabsContent>
        
        <TabsContent value="agent-models" className="mt-6">
          <AgentSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
