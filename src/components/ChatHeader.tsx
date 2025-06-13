
import React from 'react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import ChatModeSelector from './ChatModeSelector';
import AIStatusBar from './AIStatusBar';
import UserMenu from './UserMenu';
import MobileMenu from './MobileMenu';
import type { Chat, AIPlatform, ChatMode } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ChatHeaderProps {
  activeChatId: string | null;
  chats: Chat[] | undefined;
  onToggleSidebar?: () => void;
  platforms: AIPlatform[];
  onTogglePlatform: (platformId: string) => void;
  chatMode?: ChatMode;
  onChatModeChange?: (mode: ChatMode) => void;
  isolatedMode?: boolean;
  onIsolatedToggle?: (isolated: boolean) => void;
  isLoadingResponse?: boolean;
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  className?: string;
  activeTab: 'chat' | 'settings';
  setActiveTab: (tab: 'chat' | 'settings') => void;
  user: SupabaseUser | null;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  onStartFreeMode: () => void;
  onStopFreeMode: () => void;
  onUpdateFreeModeLimit: (limit: number) => void;
  onSendSingleAgentMessage: (message: string, platformId: string) => Promise<void>;
  onUpdateAgentOrder: (platforms: AIPlatform[]) => void;
  onSignOut: () => void;
  currentChatMode: ChatMode;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeChatId,
  chats,
  onToggleSidebar,
  platforms,
  onChatModeChange,
  isolatedMode,
  onIsolatedToggle,
  activeAIStatuses,
  className = "",
  setActiveTab,
  user,
  onSendSingleAgentMessage,
  onUpdateAgentOrder,
  onSignOut,
  currentChatMode
}) => {
  const isMobile = useIsMobile();
  const activeChat = chats?.find(chat => chat.id === activeChatId);
  const chatTitle = activeChat?.title || 'RoboHeard Chat';

  const handleSettingsClick = () => {
    setActiveTab('settings');
  };

  return (
    <>
      <header className={`bg-amber-100 border-b border-amber-200 h-16 flex items-center justify-between px-4 ${className}`}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Chat Title */}
        <h1 className="font-semibold text-lg truncate text-amber-900">{chatTitle}</h1>

        {/* Desktop View: Settings & User Menu */}
        {!isMobile && (
          <div className="flex items-center gap-4">
            <ChatModeSelector 
              currentMode={currentChatMode}
              onModeChange={onChatModeChange || (() => {})}
              isolatedMode={isolatedMode || false}
              onIsolatedToggle={onIsolatedToggle || (() => {})}
            />

            <ModeToggle />
            
            <UserMenu 
              user={user}
              onSettingsClick={handleSettingsClick}
              onSignOut={onSignOut}
            />
          </div>
        )}

        {/* Mobile View: Settings Sheet */}
        {isMobile && (
          <MobileMenu
            user={user}
            currentChatMode={currentChatMode}
            onChatModeChange={onChatModeChange}
            isolatedMode={isolatedMode}
            onIsolatedToggle={onIsolatedToggle}
            onSettingsClick={handleSettingsClick}
            onSignOut={onSignOut}
          />
        )}
      </header>

      {/* AI Status Bar */}
      <AIStatusBar
        platforms={platforms}
        activeAIStatuses={activeAIStatuses}
        currentChat={chats?.find(chat => chat.id === activeChatId)}
        currentMode={currentChatMode}
        onModeChange={onChatModeChange || (() => {})}
        onSendMessage={onSendSingleAgentMessage}
        onUpdateAgentOrder={onUpdateAgentOrder}
      />
    </>
  );
};

export default ChatHeader;
