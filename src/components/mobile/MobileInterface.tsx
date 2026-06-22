
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PreReleaseBanner from '@/components/PreReleaseBanner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useMultiImageGeneration } from '@/hooks/useMultiImageGeneration';
import { IMAGE_PANEL_PLATFORM } from '@/config/imageModels';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import MobileChatSidebar from './MobileChatSidebar';
import MobileHeader from './MobileHeader';
import MobileSettings from './MobileSettings';

const MobileInterface = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { platforms, togglePlatform, callAIAPI, reloadSettings, updateAgentOrder } = usePlatforms(user);

  const {
    chats,
    isLoadingChats,
    messages,
    isLoadingMessages,
    activeChatId,
    activeChatMode,
    setActiveChatId,
    createChatMutation,
    deleteChatMutation
  } = useChatManagement(user);

  const {
    input,
    setInput,
    isLoadingResponse,
    activeAIStatuses,
    sendMessageMutation,
    handleSend,
    handleStop,
    canStop,
    getPendingCount
  } = useMessageHandling(user, platforms, callAIAPI, activeChatMode);

  const messagesEndRef = useAutoScroll([messages?.length, isLoadingResponse]);

  // Auto-hide header on scroll down, show on scroll up
  const handleScroll = useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    const currentY = viewport.scrollTop;
    if (currentY < 10) {
      setHeaderVisible(true);
    } else if (currentY > lastScrollY.current + 5) {
      setHeaderVisible(false);
    } else if (currentY < lastScrollY.current - 5) {
      setHeaderVisible(true);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [handleScroll, activeView]);

  const handleCreateChat = () => {
    createChatMutation.mutate({ title: 'New Chat', chatMode: 'discussion' });
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChatMutation.mutate(chatId);
  };

  const handleChatSelect = (chatId: string) => {
    setActiveChatId(chatId);
    setIsSidebarOpen(false);
  };

  // Transform activeAIStatuses to match expected type
  const transformedStatuses = Object.entries(activeAIStatuses).reduce((acc, [key, value]) => {
    acc[key] = value ? 'responding' : 'completed';
    return acc;
  }, {} as Record<string, 'thinking' | 'responding' | 'completed' | 'error'>);

  return (
    <div className="flex flex-col h-screen bg-background relative">
      {/* Auto-hide Mobile Header */}
      <div
        className={`sticky top-0 z-30 transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <MobileHeader
          onMenuClick={() => setIsSidebarOpen(true)}
          onSettingsClick={() => setActiveView(activeView === 'settings' ? 'chat' : 'settings')}
          activeView={activeView}
          platforms={platforms}
          activeAIStatuses={transformedStatuses}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' ? (
          <>
            <PreReleaseBanner />
            <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
              <ChatMessages
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                isLoadingResponse={isLoadingResponse}
                platforms={platforms}
              />
              <div ref={messagesEndRef} className="h-4" />
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <ChatInput
                input={input}
                setInput={setInput}
                handleSend={() => handleSend(activeChatId)}
                handleStop={handleStop}
                isLoadingResponse={isLoadingResponse}
                isPending={sendMessageMutation.isPending}
                canStop={canStop}
                pendingCount={getPendingCount()}
                isFreeMode={false}
                isFreeModeRunning={false}
                onSendAndStartConversation={() => {}}
              />
            </div>
          </>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <MobileSettings platforms={platforms} onTogglePlatform={togglePlatform} />
          </ScrollArea>
        )}
      </div>

      {/* Side Navigation Sheet */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <MobileChatSidebar
            chats={chats}
            isLoadingChats={isLoadingChats}
            activeChatId={activeChatId}
            onChatSelect={handleChatSelect}
            onCreateChat={handleCreateChat}
            onDeleteChat={handleDeleteChat}
            isCreatingChat={createChatMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Floating Action Button */}
      {activeView === 'chat' && (
        <Button
          onClick={handleCreateChat}
          className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-10"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default MobileInterface;
