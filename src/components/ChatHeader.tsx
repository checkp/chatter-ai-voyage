
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Settings, MessageSquare, User, LogOut, Sparkles, Grid3X3, Users, Shield, ShieldOff } from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import TokenBalance from './TokenBalance';
import FreeModeControls from './FreeModeControls';
import ConductorControls from './ConductorControls';
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
  // Conductor props
  conductorState?: {
    isActive: boolean;
    isAnalyzing: boolean;
    conversationCount: number;
    lastSummary: string | null;
  };
  onStartConductor?: () => void;
  onStopConductor?: () => void;
  onRequestConductorDirection?: () => void;
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
  onTogglePlatform,
  conductorState,
  onStartConductor,
  onStopConductor,
  onRequestConductorDirection
}) => {
  const [showChangelog, setShowChangelog] = useState(false);
  
  const activeChat = chats?.find(chat => chat.id === activeChatId);
  const truncatedTitle = activeChat?.title ? 
    (activeChat.title.length > 30 ? `${activeChat.title.substring(0, 30)}...` : activeChat.title) 
    : 'RoboHeard';

  const getChatModeIcon = (mode: ChatMode) => {
    return mode === 'side-by-side' ? Grid3X3 : Users;
  };

  const ChatModeIcon = getChatModeIcon(currentChatMode);

  return (
    <TooltipProvider>
      <header className="flex items-center justify-between p-3 bg-background border-b border-border min-h-[60px]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 className="text-lg font-semibold text-foreground truncate cursor-help">
                  {truncatedTitle}
                </h1>
              </TooltipTrigger>
              <TooltipContent>
                <p>{activeChat?.title || 'RoboHeard'}</p>
              </TooltipContent>
            </Tooltip>
            
            {activeChat && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {currentChatMode} {isolatedMode && '• isolated'}
              </Badge>
            )}
          </div>

          {/* Chat Mode Controls - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const nextMode = currentChatMode === 'discussion' ? 'side-by-side' : 'discussion';
                      onChatModeChange(nextMode);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <ChatModeIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch to {currentChatMode === 'discussion' ? 'side-by-side' : 'discussion'} mode</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onIsolatedModeToggle(!isolatedMode)}
                    className="h-8 w-8 p-0"
                  >
                    {isolatedMode ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isolatedMode ? 'Disable' : 'Enable'} isolated mode</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Conductor Controls - only show when on chat tab */}
          {activeTab === 'chat' && activeChatId && conductorState && onStartConductor && onStopConductor && onRequestConductorDirection && (
            <ConductorControls
              isActive={conductorState.isActive}
              isAnalyzing={conductorState.isAnalyzing}
              conversationCount={conductorState.conversationCount}
              lastSummary={conductorState.lastSummary}
              onStart={onStartConductor}
              onStop={onStopConductor}
              onRequestDirection={onRequestConductorDirection}
            />
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

          {/* Tab Navigation with Icons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'chat' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('chat')}
                  className="h-8 w-8 p-0"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTab === 'settings' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* User Controls */}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>User menu</p>
                </TooltipContent>
              </Tooltip>
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
