
import React from 'react';
import { useIndexPageLogic } from '@/hooks/useIndexPageLogic';
import AuthPage from '@/components/AuthPage';
import MobileInterface from '@/components/mobile/MobileInterface';
import MainLayout from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

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

  // Show connection error state if there are persistent issues
  const hasConnectionIssues = createChatMutation.isError && 
    createChatMutation.error?.message?.includes('Load failed');

  if (hasConnectionIssues) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-xl">Connection Issues</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              We're having trouble connecting to our servers. Your authentication is working, 
              but some features may be temporarily unavailable.
            </p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleSignOut} 
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
