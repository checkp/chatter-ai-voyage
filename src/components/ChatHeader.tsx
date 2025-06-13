
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, Settings, User, LogOut } from 'lucide-react';
import ChatModeSelector from './ChatModeSelector';
import AIStatusBar from './AIStatusBar';
import ProfileDialog from './ProfileDialog';
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
  onTogglePlatform,
  chatMode,
  onChatModeChange,
  isolatedMode,
  onIsolatedToggle,
  isLoadingResponse,
  activeAIStatuses,
  className = "",
  activeTab,
  setActiveTab,
  user,
  isFreeMode,
  isFreeModeRunning,
  freeModeMessageLimit,
  freeModeMessageCount,
  onStartFreeMode,
  onStopFreeMode,
  onUpdateFreeModeLimit,
  onSendSingleAgentMessage,
  onUpdateAgentOrder,
  onSignOut,
  currentChatMode
}) => {
  const isMobile = useIsMobile();
  const activeChat = chats?.find(chat => chat.id === activeChatId);
  const chatTitle = activeChat?.title || 'RoboHeard Chat';
  
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const handleSettingsClick = () => {
    setActiveTab('settings');
  };

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
  };

  const handleLogoutClick = () => {
    onSignOut();
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-amber-200 text-amber-800 text-sm">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm text-amber-800">
                    {user?.email?.split('@')[0] || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogoutClick} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Mobile View: Settings Sheet */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-96">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Access your account and preferences.
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-6 space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-amber-200 text-amber-800">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={handleProfileClick}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={handleSettingsClick}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={handleLogoutClick}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

                <ChatModeSelector 
                  currentMode={currentChatMode}
                  onModeChange={onChatModeChange || (() => {})}
                  isolatedMode={isolatedMode || false}
                  onIsolatedToggle={onIsolatedToggle || (() => {})}
                  className="mt-4"
                />
              </div>
            </SheetContent>
          </Sheet>
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

      {/* Profile Dialog */}
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user}
      />
    </>
  );
};

export default ChatHeader;
