
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';
import SideBySideLayout from '@/components/SideBySideLayout';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import ContactUsButton from '@/components/ContactUsButton';
import type { DesktopInterfaceProps } from './types';

const DesktopInterface: React.FC<DesktopInterfaceProps> = ({
  chats,
  isLoadingChats,
  activeChatId,
  setActiveChatId,
  handleCreateChat,
  handleDeleteChat,
  createChatMutation,
  messages,
  isLoadingMessages,
  isLoadingResponse,
  platforms,
  activeTab,
  setActiveTab,
  user,
  isFreeMode,
  isFreeModeRunning,
  freeModeMessageLimit,
  freeModeMessageCount,
  handleStartFreeMode,
  stopFreeMode,
  updateMessageLimit,
  handleSingleAgentMessage,
  updateAgentOrder,
  handleSignOut,
  activeChatMode,
  isolatedMode,
  handleChatModeChange,
  handleIsolatedModeToggle,
  togglePlatform,
  transformedStatuses,
  currentChatWithMessages,
  scrollAreaRef,
  messagesEndRef,
  input,
  setInput,
  handleSend,
  handleStop,
  sendMessageMutation,
  canStop,
  getPendingCount,
  handleSendAndStartConversation
}) => {
  const effectiveChatMode = activeChatMode;

  return (
    <div className="min-h-screen bg-background flex h-screen overflow-hidden">
      <ChatSidebar 
        chats={chats}
        isLoadingChats={isLoadingChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        onCreateChat={() => handleCreateChat()}
        onDeleteChat={handleDeleteChat}
        isCreatingChat={createChatMutation.isPending}
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
          onStartFreeMode={handleStartFreeMode}
          onStopFreeMode={stopFreeMode}
          onUpdateFreeModeLimit={updateMessageLimit}
          onSendSingleAgentMessage={handleSingleAgentMessage}
          onUpdateAgentOrder={updateAgentOrder}
          onSignOut={handleSignOut}
          currentChatMode={activeChatMode}
          isolatedMode={isolatedMode}
          onChatModeChange={handleChatModeChange}
          onIsolatedModeToggle={handleIsolatedModeToggle}
          onTogglePlatform={togglePlatform}
        />

        {/* Add the Draggable AI Status Bar */}
        <div className="bg-secondary/50 border-b border-border px-4 py-2">
          <DraggableAIStatusBar
            platforms={platforms}
            activeAIStatuses={transformedStatuses}
            onReorder={updateAgentOrder}
            onAgentClick={(platform) => {
              console.log('Agent clicked:', platform.name);
            }}
            currentChat={currentChatWithMessages}
            onSendMessage={handleSingleAgentMessage}
          />
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <>
              {effectiveChatMode === 'side-by-side' ? (
                <SideBySideLayout
                  enabledPlatforms={platforms}
                  messages={messages}
                  isLoadingResponse={isLoadingResponse}
                  activeAIStatuses={transformedStatuses}
                  onTogglePlatform={togglePlatform}
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
            onSendAndStartConversation={handleSendAndStartConversation}
          />
        )}
      </main>

      {/* Contact Us Button */}
      <ContactUsButton />
    </div>
  );
};

export default DesktopInterface;
