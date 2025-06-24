
import React from 'react';
import { useIndexPageLogic } from '@/hooks/useIndexPageLogic';
import AuthPage from '@/components/AuthPage';
import MobileInterface from '@/components/mobile/MobileInterface';
import MainLayout from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  const {
    user,
    handleSignOut,
    platforms,
    togglePlatform,
    updateAgentOrder,
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    activeChatMode,
    isolatedMode,
    conductorPlatform,
    setActiveChatId,
    createChatMutation,
    deleteChatMutation,
    activeAIStatuses,
    sendMessageMutation,
    conductorPlatformObj,
    conductorMessages,
    isLoadingConductor,
    sendConductorMessage,
    isFreeMode,
    isFreeModeRunning,
    freeModeMessageCount,
    freeModeMessageLimit,
    startFreeMode,
    stopFreeMode,
    updateMessageLimit,
    activeTab,
    setActiveTab,
    showWelcome,
    setShowWelcome,
    input,
    setInput,
    handleChatModeChange,
    handleConductorPlatformChange,
    handleIsolatedModeToggle,
    handleSendMessage,
    handleSend
  } = useIndexPageLogic();

  if (!user) {
    return <AuthPage />;
  }

  if (isMobile) {
    return <MobileInterface />;
  }

  // Convert boolean activeAIStatuses to the expected string format
  const convertedActiveAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'> = {};
  Object.entries(activeAIStatuses).forEach(([key, value]) => {
    convertedActiveAIStatuses[key] = value ? 'responding' : 'completed';
  });

  return (
    <MainLayout
      chats={chats}
      activeChatId={activeChatId}
      activeAIStatuses={convertedActiveAIStatuses}
      platforms={platforms}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      isFreeMode={isFreeMode}
      isFreeModeRunning={isFreeModeRunning}
      freeModeMessageLimit={freeModeMessageLimit}
      freeModeMessageCount={freeModeMessageCount}
      onStartFreeMode={startFreeMode}
      onStopFreeMode={stopFreeMode}
      onUpdateFreeModeLimit={updateMessageLimit}
      onSendSingleAgentMessage={(message: string, platformId: string) => handleSendMessage(message, [platformId])}
      onUpdateAgentOrder={updateAgentOrder}
      onSignOut={handleSignOut}
      currentChatMode={activeChatMode}
      isolatedMode={isolatedMode}
      onChatModeChange={handleChatModeChange}
      onIsolatedModeToggle={handleIsolatedModeToggle}
      onTogglePlatform={togglePlatform}
      conductorPlatform={conductorPlatform}
      onConductorPlatformChange={handleConductorPlatformChange}
      setActiveChatId={setActiveChatId}
      onCreateChat={() => createChatMutation.mutate({ title: 'New Conversation' })}
      onDeleteChat={(chatId: string) => deleteChatMutation.mutate(chatId)}
      isLoadingChats={isLoadingChats}
      isCreatingChat={createChatMutation.isPending}
      showWelcome={showWelcome}
      activeChatMode={activeChatMode}
      conductorPlatformObj={conductorPlatformObj}
      conductorMessages={conductorMessages}
      isLoadingConductor={isLoadingConductor}
      sendConductorMessage={sendConductorMessage}
      messages={messages}
      isLoadingMessages={isLoadingMessages}
      sendMessageMutation={sendMessageMutation}
      input={input}
      setInput={setInput}
      handleSend={handleSend}
      createChatMutation={createChatMutation}
      setShowWelcome={setShowWelcome}
      togglePlatform={togglePlatform}
      updateAgentOrder={updateAgentOrder}
      handleSendMessage={handleSendMessage}
    />
  );
};

export default Index;
