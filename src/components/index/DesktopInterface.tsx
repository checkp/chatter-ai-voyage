
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';
import SideBySideLayout from '@/components/SideBySideLayout';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import ContactUsButton from '@/components/ContactUsButton';
import ConductorSummary from '@/components/ConductorSummary';
import { useConductor } from '@/hooks/useConductor';
import MainContent from './MainContent';
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
  // Initialize conductor hook
  const {
    conductorState,
    conductorAnalysis,
    startConductor,
    stopConductor,
    requestConductorDirection
  } = useConductor(user);

  // Show conductor summary state
  const [showConductorSummary, setShowConductorSummary] = React.useState(false);

  // Handle conductor direction request
  const handleRequestConductorDirection = async () => {
    if (!messages || !platforms) return;
    
    const enabledPlatforms = platforms.filter(p => p.enabled);
    const direction = await requestConductorDirection(messages, enabledPlatforms);
    
    if (direction) {
      setShowConductorSummary(true);
    }
  };

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
          onStartConductor={startConductor}
          onStopConductor={stopConductor}
          onRequestConductorDirection={handleRequestConductorDirection}
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

        <MainContent
          activeTab={activeTab}
          activeChatMode={activeChatMode}
          isolatedMode={isolatedMode}
          platforms={platforms}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          isLoadingResponse={isLoadingResponse}
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
        />
      </main>

      {/* Conductor Summary */}
      <ConductorSummary
        summary={conductorState.lastSummary || ''}
        isVisible={showConductorSummary}
        onClose={() => setShowConductorSummary(false)}
      />

      {/* Contact Us Button */}
      <ContactUsButton />
    </div>
  );
};

export default DesktopInterface;
