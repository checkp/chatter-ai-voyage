
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, MessageSquare, User, LogOut, Sparkles } from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import TokenBalance from './TokenBalance';
import ChatModeSelector from './ChatModeSelector';
import FreeModeControls from './FreeModeControls';
import ChangelogDialog from './ChangelogDialog';
import type { Chat, ChatMode, AIPlatform } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ChatHeaderProps {
  chats: Chat[] | undefined;
  activeChatId: string | null;
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  platforms: AIPlatform[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: SupabaseUser;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  onStartFreeMode: () => void;
  onStopFreeMode: () => void;
  onUpdateFreeModeLimit: (limit: number) => void;
  onSendSingleAgentMessage: (message: string, platformId: string) => void;
  onUpdateAgentOrder: (reorderedPlatforms: AIPlatform[]) => void;
  onSignOut: () => void;
  currentChatMode: ChatMode;
  isolatedMode: boolean;
  onChatModeChange: (mode: ChatMode) => void;
  onIsolatedModeToggle: (isolated: boolean) => void;
  onTogglePlatform: (platformId: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chats,
  activeChatId,
  activeAIStatuses,
  platforms,
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
  currentChatMode,
  isolatedMode,
  onChatModeChange,
  onIsolatedModeToggle,
  onTogglePlatform
}) => {
  const [showChangelog, setShowChangelog] = useState(false);
  
  const activeChat = chats?.find(chat => chat.id === activeChatId);

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">
              {activeChat?.title || 'RoboHerd'}
            </h1>
            {activeChat && (
              <Badge variant="outline" className="text-xs">
                {currentChatMode} {isolatedMode && '• isolated'}
              </Badge>
            )}
          </div>

          {/* Chat Mode Selector - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && (
            <ChatModeSelector
              currentMode={currentChatMode}
              onModeChange={onChatModeChange}
              isolatedMode={isolatedMode}
              onIsolatedToggle={onIsolatedModeToggle}
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Free Mode Controls - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && (
            <FreeModeControls
              isFreeMode={isFreeMode}
              isFreeModeRunning={isFreeModeRunning}
              freeModeMessageLimit={freeModeMessageLimit}
              freeModeMessageCount={freeModeMessageCount}
              onStart={onStartFreeMode}
              onStop={onStopFreeMode}
              onUpdateLimit={onUpdateFreeModeLimit}
            />
          )}

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <TokenBalance user={user} onPurchaseClick={() => setActiveTab('settings')} />
            <ModeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowChangelog(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  What's New?
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ChangelogDialog 
        open={showChangelog} 
        onOpenChange={setShowChangelog} 
      />
    </>
  );
};

export default ChatHeader;
