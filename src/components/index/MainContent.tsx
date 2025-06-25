
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';
import SideBySideLayout from '@/components/SideBySideLayout';
import type { AIPlatform, ChatMode } from '@/types/chat';

interface MainContentProps {
  activeTab: string;
  activeChatMode: ChatMode;
  isolatedMode: boolean;
  platforms: AIPlatform[];
  messages: any;
  isLoadingMessages: boolean;
  isLoadingResponse: boolean;
  transformedStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  togglePlatform: (platformId: string) => void;
  scrollAreaRef: React.RefObject<any>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  activeChatId: string | null;
  input: string;
  setInput: (input: string) => void;
  handleSend: (activeChatId: string | null) => void;
  handleStop: () => void;
  sendMessageMutation: any;
  canStop: boolean;
  getPendingCount: () => number;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  handleSendAndStartConversation: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  activeChatMode,
  isolatedMode,
  platforms,
  messages,
  isLoadingMessages,
  isLoadingResponse,
  transformedStatuses,
  togglePlatform,
  scrollAreaRef,
  messagesEndRef,
  activeChatId,
  input,
  setInput,
  handleSend,
  handleStop,
  sendMessageMutation,
  canStop,
  getPendingCount,
  isFreeMode,
  isFreeModeRunning,
  handleSendAndStartConversation
}) => {
  return (
    <>
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <>
            {activeChatMode === 'side-by-side' ? (
              <SideBySideLayout
                enabledPlatforms={platforms}
                messages={messages}
                isLoadingResponse={isLoadingResponse}
                activeAIStatuses={transformedStatuses}
                onTogglePlatform={togglePlatform}
                chatMode={activeChatMode}
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
          onSendAndStartConversation={handleSendAndStartConversation}
        />
      )}
    </>
  );
};

export default MainContent;
