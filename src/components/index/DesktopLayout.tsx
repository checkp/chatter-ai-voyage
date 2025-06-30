
import React from 'react';
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import ContactUsButton from '@/components/ContactUsButton';
import ConductorSummary from '@/components/ConductorSummary';
import MainContent from './MainContent';
import type { DesktopInterfaceProps } from './types';

interface DesktopLayoutProps extends DesktopInterfaceProps {
  conductorState: any;
  onStartConductor: () => void;
  onStopConductor: () => void;
  onRequestConductorDirection: () => Promise<void>;
  conductorMessages: any;
  conductorAgent: string;
  onConductorAgentChange: (agent: string) => void;
  handleConductorSend: (message: string) => Promise<void>;
  showConductorSummary: boolean;
  setShowConductorSummary: (show: boolean) => void;
  currentSummary: string;
  conductorIsProcessing: boolean;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
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
  handleSendAndStartConversation,
  conductorState,
  onStartConductor,
  onStopConductor,
  onRequestConductorDirection,
  conductorMessages,
  conductorAgent,
  onConductorAgentChange,
  handleConductorSend,
  showConductorSummary,
  setShowConductorSummary,
  currentSummary,
  conductorIsProcessing
}) => {
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
          conductorState={conductorState}
          onStartConductor={onStartConductor}
          onStopConductor={onStopConductor}
          onRequestConductorDirection={onRequestConductorDirection}
        />

        {/* Add the Draggable AI Status Bar - hide in conductor mode */}
        {activeChatMode !== 'conductor' && (
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
        )}

        <MainContent
          activeTab={activeTab}
          activeChatMode={activeChatMode}
          isolatedMode={isolatedMode}
          platforms={platforms}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          isLoadingResponse={isLoadingResponse || conductorIsProcessing}
          transformedStatuses={transformedStatuses}
          togglePlatform={togglePlatform}
          scrollAreaRef={scrollAreaRef}
          messagesEndRef={messagesEndRef}
          activeChatId={activeChatId}
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleStop={handleStop}
          sendMessageMutation={sendMessageMutation}
          canStop={canStop}
          getPendingCount={getPendingCount}
          isFreeMode={isFreeMode}
          isFreeModeRunning={isFreeModeRunning}
          handleSendAndStartConversation={handleSendAndStartConversation}
          conductorMessages={conductorMessages}
          conductorAgent={conductorAgent}
          onConductorAgentChange={onConductorAgentChange}
          handleConductorSend={handleConductorSend}
          user={user}
        />
      </main>

      {/* Conductor Summary - only show in non-conductor modes */}
      {activeChatMode !== 'conductor' && (
        <ConductorSummary
          summary={currentSummary}
          isVisible={showConductorSummary}
          onClose={() => setShowConductorSummary(false)}
        />
      )}

      {/* Contact Us Button */}
      <ContactUsButton />
    </div>
  );
};

export default DesktopLayout;
