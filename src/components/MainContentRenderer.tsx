
import React from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import SettingsPanel from '@/components/SettingsPanel';
import ConductorChat from '@/components/ConductorChat';
import SideBySideLayout from '@/components/SideBySideLayout';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import type { AIPlatform, Message, Chat, ChatMode } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface MainContentRendererProps {
  showWelcome: boolean;
  activeTab: string;
  activeChatMode: ChatMode;
  conductorPlatformObj: AIPlatform | undefined;
  conductorMessages: Message[];
  isLoadingConductor: boolean;
  sendConductorMessage: (content: string) => void;
  platforms: AIPlatform[];
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  sendMessageMutation: any;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  createChatMutation: any;
  setShowWelcome: (show: boolean) => void;
  togglePlatform: (platformId: string) => Promise<void>;
  updateAgentOrder: (reorderedPlatforms: AIPlatform[]) => Promise<void>;
  user: SupabaseUser;
  handleSendMessage: (message: string, platformIds?: string[]) => void;
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  isolatedMode: boolean;
}

const MainContentRenderer: React.FC<MainContentRendererProps> = ({
  showWelcome,
  activeTab,
  activeChatMode,
  conductorPlatformObj,
  conductorMessages,
  isLoadingConductor,
  sendConductorMessage,
  platforms,
  messages,
  isLoadingMessages,
  sendMessageMutation,
  input,
  setInput,
  handleSend,
  createChatMutation,
  setShowWelcome,
  togglePlatform,
  updateAgentOrder,
  user,
  handleSendMessage,
  activeAIStatuses,
  isolatedMode
}) => {
  if (showWelcome) {
    return (
      <WelcomeScreen
        onGetStarted={() => {
          createChatMutation.mutate({ title: 'New Conversation' });
          setShowWelcome(false);
        }}
        onSkip={() => setShowWelcome(false)}
      />
    );
  }

  if (activeTab === 'settings') {
    return <SettingsPanel />;
  }

  if (activeTab === 'conductor' && activeChatMode === 'conductor') {
    return (
      <ConductorChat
        conductorPlatform={conductorPlatformObj}
        messages={conductorMessages}
        isLoading={isLoadingConductor}
        onSendMessage={sendConductorMessage}
      />
    );
  }

  if (activeChatMode === 'side-by-side') {
    // Convert activeAIStatuses to boolean format for SideBySideLayout
    const booleanStatuses: Record<string, boolean> = {};
    Object.keys(activeAIStatuses).forEach(key => {
      booleanStatuses[key] = activeAIStatuses[key] === 'thinking' || activeAIStatuses[key] === 'responding';
    });

    return (
      <SideBySideLayout
        enabledPlatforms={platforms}
        messages={messages}
        isLoadingResponse={sendMessageMutation.isPending}
        activeAIStatuses={booleanStatuses}
        onTogglePlatform={togglePlatform}
        chatMode={activeChatMode}
        isolatedMode={isolatedMode}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ChatMessages 
          messages={messages || []} 
          isLoadingMessages={isLoadingMessages}
          isLoadingResponse={sendMessageMutation.isPending}
          platforms={platforms}
        />
      </div>
      <ChatInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isLoadingResponse={sendMessageMutation.isPending}
        isPending={sendMessageMutation.isPending}
      />
    </div>
  );
};

export default MainContentRenderer;
