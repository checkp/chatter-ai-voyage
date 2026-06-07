
import React, { useEffect, useState } from 'react';
import PreReleaseBanner from '@/components/PreReleaseBanner';
import ChatSidebar from '@/components/ChatSidebar';
import ChatHeader from '@/components/ChatHeader';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';


import ConductorSummary from '@/components/ConductorSummary';
import GuidedTour from '@/components/GuidedTour';
import ChangelogDialog from '@/components/ChangelogDialog';
import { useTour } from '@/hooks/useTour';
import { changelog } from '@/data/changelog';
import MainContent from './MainContent';
import type { DesktopInterfaceProps } from './types';

const CHANGELOG_STORAGE_KEY = 'roboheard_last_seen_changelog';

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
  const tour = useTour();
  const [showChangelog, setShowChangelog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-launch tour for users who haven't completed it
  useEffect(() => {
    if (!tour.hasCompletedTour && !tour.isActive) {
      const timer = setTimeout(() => tour.startTour(), 1500);
      return () => clearTimeout(timer);
    }
  }, [tour.hasCompletedTour, tour.isActive]);

  // Auto-show changelog when version changes
  useEffect(() => {
    const lastSeen = localStorage.getItem(CHANGELOG_STORAGE_KEY);
    const latestVersion = changelog[0]?.version;
    if (latestVersion && lastSeen !== latestVersion) {
      // Don't show changelog if tour is about to start (first-time users)
      if (tour.hasCompletedTour) {
        setShowChangelog(true);
      }
    }
  }, [tour.hasCompletedTour]);

  const handleChangelogClose = (open: boolean) => {
    setShowChangelog(open);
    if (!open) {
      localStorage.setItem(CHANGELOG_STORAGE_KEY, changelog[0]?.version || '');
    }
  };

  return (
    <div className="min-h-screen bg-background flex h-screen overflow-hidden">
      {sidebarCollapsed ? (
        <div className="w-12 bg-secondary border-r border-border flex flex-col items-center py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <ChatSidebar
            chats={chats}
            isLoadingChats={isLoadingChats}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            onCreateChat={() => handleCreateChat()}
            onDeleteChat={handleDeleteChat}
            isCreatingChat={createChatMutation.isPending}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-2 h-7 w-7 z-10"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      )}

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
          onStartTour={tour.startTour}
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

        {activeTab === 'chat' && <PreReleaseBanner />}

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

      {/* Floating Activity Console */}
      <FloatingActivityConsole />


      {/* Guided Tour Overlay */}
      <GuidedTour
        isActive={tour.isActive}
        currentStep={tour.currentStep}
        steps={tour.visibleSteps}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onEnd={tour.endTour}
      />

      {/* What's New Dialog */}
      <ChangelogDialog open={showChangelog} onOpenChange={handleChangelogClose} />
    </div>
  );
};

export default DesktopLayout;
