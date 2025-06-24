
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Settings, MessageSquare, User, LogOut, Sparkles, Crown, Grid3X3, Users, SwitchCamera } from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import TokenBalance from './TokenBalance';
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

  const getChatModeIcon = (mode: ChatMode) => {
    switch (mode) {
      case 'conductor':
        return Crown;
      case 'side-by-side':
        return Grid3X3;
      default:
        return Users;
    }
  };

  const ModeIcon = getChatModeIcon(currentChatMode);

  const handleChatModeChange = (mode: ChatMode) => {
    console.log('ChatHeader: Changing to mode:', mode);
    try {
      onChatModeChange(mode);
    } catch (error) {
      console.error('ChatHeader: Error changing chat mode:', error);
    }
  };

  return (
    <TooltipProvider>
      <header className="flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">
            {activeChat?.title || 'RoboHeard'}
          </h1>
          {activeChat && (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              <ModeIcon className="h-3 w-3 mr-1" />
              {currentChatMode} {isolatedMode && '• isolated'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Chat Mode Controls - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && (
            <div className="flex items-center gap-1">
              {/* View Mode Buttons */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentChatMode === 'discussion' ? "default" : "outline"}
                    size="icon"
                    onClick={() => handleChatModeChange('discussion')}
                    className="h-8 w-8"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Discussion mode</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentChatMode === 'conductor' ? "default" : "outline"}
                    size="icon"
                    onClick={() => handleChatModeChange('conductor')}
                    className="h-8 w-8"
                  >
                    <Crown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Conductor mode - AI-moderated discussion</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentChatMode === 'side-by-side' ? "default" : "outline"}
                    size="icon"
                    onClick={() => handleChatModeChange('side-by-side')}
                    className="h-8 w-8"
                    disabled={false}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Side-by-side mode</p>
                </TooltipContent>
              </Tooltip>

              {/* Isolated Mode Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isolatedMode ? "default" : "outline"}
                    size="icon"
                    onClick={() => onIsolatedModeToggle(!isolatedMode)}
                    disabled={currentChatMode === 'conductor'}
                    className="h-8 w-8"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle isolated mode</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

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

          {/* Tab Navigation - Icon Only */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-fit grid-cols-2 h-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="chat" className="h-6 w-8 p-0">
                    <MessageSquare className="h-4 w-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chat</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="settings" className="h-6 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>

          {/* User Menu */}
          <div className="flex items-center gap-1">
            <TokenBalance user={user} onPurchaseClick={() => setActiveTab('settings')} />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ModeToggle />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle theme</p>
              </TooltipContent>
            </Tooltip>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
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
    </TooltipProvider>
  );
};

export default ChatHeader;
