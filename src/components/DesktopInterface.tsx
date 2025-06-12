
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';
import SideBySideLayout from '@/components/SideBySideLayout';
import ContactUsButton from '@/components/ContactUsButton';
import type { Chat, AIPlatform, ChatMode } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface DesktopInterfaceProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  messages: any;
  isLoadingMessages: boolean;
  activeChatId: string | null;
  activeChatMode: ChatMode;
  isolatedMode: boolean;
  platforms: AIPlatform[];
  activeTab: 'chat' | 'settings';
  setActiveTab: (tab: 'chat' | 'settings') => void;
  user: SupabaseUser | null;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  input: string;
  setInput: (input: string) => void;
  isLoadingResponse: boolean;
  activeAIStatuses: Record<string, boolean>;
  canStop: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  transformedStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  effectiveChatMode: ChatMode;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onChatModeChange: (mode: ChatMode) => void;
  onIsolatedToggle: (isolated: boolean) => void;
  onStartFreeMode: () => void;
  onStopFreeMode: () => void;
  onUpdateFreeModeLimit: (limit: number) => void;
  onSingleAgentMessage: (message: string, platformId: string) => Promise<void>;
  onUpdateAgentOrder: (platforms: AIPlatform[]) => void;
  onSignOut: () => void;
  onTogglePlatform: (platformId: string) => void;
  setActiveChatId: (chatId: string | null) => void;
  handleSend: (chatId: string | null) => void;
  handleStop: () => void;
  sendMessageMutation: any;
  getPendingCount: () => number;
  onSendAndStartConversation: () => void;
}

const DesktopInterface: React.FC<DesktopInterfaceProps> = ({
  chats,
  isLoadingChats,
  messages,
  isLoadingMessages,
  activeChatId,
  activeChatMode,
  isolatedMode,
  platforms,
  activeTab,
  setActiveTab,
  user,
  isFreeMode,
  isFreeModeRunning,
  freeModeMessageLimit,
  freeModeMessageCount,
  input,
  setInput,
  isLoadingResponse,
  activeAIStatuses,
  canStop,
  messagesEndRef,
  scrollAreaRef,
  transformedStatuses,
  effectiveChatMode,
  onCreateChat,
  onDeleteChat,
  onChatModeChange,
  onIsolatedToggle,
  onStartFreeMode,
  onStopFreeMode,
  onUpdateFreeModeLimit,
  onSingleAgentMessage,
  onUpdateAgentOrder,
  onSignOut,
  onTogglePlatform,
  setActiveChatId,
  handleSend,
  handleStop,
  sendMessageMutation,
  getPendingCount,
  onSendAndStartConversation
}) => {
  return (
    <div className="min-h-screen bg-background flex h-screen overflow-hidden">
      <ChatSidebar 
        chats={chats}
        isLoadingChats={isLoadingChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        onCreateChat={onCreateChat}
        onDeleteChat={onDeleteChat}
        isCreatingChat={false}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">        
        <ChatHeader 
          chats={chats}
          activeChatId={activeChatId}
          activeAIStatuses={transformedStatuses}
          platforms={platforms}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          isFreeMode={isFreeMode}
          isFreeModeRunning={isFreeModeRunning}
          freeModeMessageLimit={freeModeMessageLimit}
          freeModeMessageCount={freeModeMessageCount}
          onStartFreeMode={onStartFreeMode}
          onStopFreeMode={onStopFreeMode}
          onUpdateFreeModeLimit={onUpdateFreeModeLimit}
          onSendSingleAgentMessage={onSingleAgentMessage}
          onUpdateAgentOrder={onUpdateAgentOrder}
          onSignOut={onSignOut}
          currentChatMode={activeChatMode}
          isolatedMode={isolatedMode}
          onChatModeChange={onChatModeChange}
          onIsolatedToggle={onIsolatedToggle}
          onTogglePlatform={onTogglePlatform}
        />

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <>
              {effectiveChatMode === 'side-by-side' ? (
                <SideBySideLayout
                  enabledPlatforms={platforms}
                  messages={messages}
                  isLoadingResponse={isLoadingResponse}
                  activeAIStatuses={activeAIStatuses}
                  onTogglePlatform={onTogglePlatform}
                  chatMode={effectiveChatMode}
                  isolatedMode={isolatedMode}
                />
              ) : (
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                  <div className="p-4">
                    <ChatMessages 
                      messages={messages}
                      isLoadingMessages={isLoadingMessages}
                      isLoadingResponse={isLoadingResponse}
                      platforms={platforms}
                    />
                    <div ref={messagesEndRef} className="h-4" />
                  </div>
                </ScrollArea>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <ScrollArea className="h-full">
              <div className="p-4">
                <SettingsPanel />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Input */}
        {activeTab === 'chat' && (
          <ChatInput 
            input={input}
            setInput={setInput}
            handleSend={() => handleSend(activeChatId)}
            handleStop={handleStop}
            isLoadingResponse={isLoadingResponse}
            isPending={sendMessageMutation.isPending}
            canStop={canStop}
            pendingCount={getPendingCount()}
            isFreeMode={isFreeMode}
            isFreeModeRunning={isFreeModeRunning}
            onSendAndStartConversation={onSendAndStartConversation}
          />
        )}
      </main>

      {/* Contact Us Button */}
      <ContactUsButton />
    </div>
  );
};

export default DesktopInterface;
