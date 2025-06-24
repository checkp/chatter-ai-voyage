
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, MessageSquare, Settings, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import MobileChatSidebar from './MobileChatSidebar';
import MobileHeader from './MobileHeader';
import MobileSettings from './MobileSettings';

const MobileInterface = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
  
  const { platforms, togglePlatform, callAIAPI, reloadSettings, updateAgentOrder } = usePlatforms(user);
  const { messagesEndRef, scrollToBottom, scrollToBottomImmediate } = useScrollToBottom();

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
    activeAIStatuses,
    sendMessageMutation
  } = useMessageHandling(user, platforms, callAIAPI, activeChatMode);

  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || !activeChatId) return;
    
    sendMessageMutation.mutate({
      chatId: activeChatId,
      content: input.trim(),
      enabledPlatforms: platforms.filter(p => p.enabled && p.hasApiKey)
    });
    setInput('');
  };

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

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, scrollToBottom]);

  // Transform activeAIStatuses to match expected type
  const transformedStatuses = Object.entries(activeAIStatuses).reduce((acc, [key, value]) => {
    acc[key] = value === 'thinking' || value === 'responding' ? 'responding' : 'completed';
    return acc;
  }, {} as Record<string, 'thinking' | 'responding' | 'completed' | 'error'>);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <MobileHeader
        onMenuClick={() => setIsSidebarOpen(true)}
        onSettingsClick={() => setActiveView(activeView === 'settings' ? 'chat' : 'settings')}
        activeView={activeView}
        platforms={platforms}
        activeAIStatuses={transformedStatuses}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' ? (
          <>
            {/* Chat Messages */}
            <ScrollArea className="flex-1 px-4">
              <ChatMessages 
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                isLoadingResponse={sendMessageMutation.isPending}
                platforms={platforms}
              />
              <div ref={messagesEndRef} className="h-4" />
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t bg-background">
              <ChatInput 
                input={input}
                setInput={setInput}
                handleSend={handleSend}
                isLoadingResponse={sendMessageMutation.isPending}
                isPending={sendMessageMutation.isPending}
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
