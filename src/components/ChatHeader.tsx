
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
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
import { Menu, Settings, User } from 'lucide-react';
import AgentViewToggle from './AgentViewToggle';
import ChatModeSelector from './ChatModeSelector';
import type { Chat, AIPlatform, ChatMode } from '@/types/chat';

interface ChatHeaderProps {
  activeChatId: string | null;
  chats: Chat[] | undefined;
  onToggleSidebar: () => void;
  platforms: AIPlatform[];
  onTogglePlatform: (platformId: string) => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  isolatedMode: boolean;
  onIsolatedToggle: (isolated: boolean) => void;
  isLoadingResponse: boolean;
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  className?: string;
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
  className = ""
}) => {
  const isMobile = useIsMobile();
  const activeChat = chats?.find(chat => chat.id === activeChatId);
  const chatTitle = activeChat?.title || 'RoboHeard Chat';

  return (
    <header className={`bg-secondary border-b border-border h-16 flex items-center justify-between px-4 ${className}`}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Chat Title */}
      <h1 className="font-semibold text-lg truncate">{chatTitle}</h1>

      {/* Desktop View: Agent Toggles and Settings */}
      {!isMobile && (
        <div className="flex items-center gap-4">
          <AgentViewToggle 
            platforms={platforms}
            activeAIStatuses={activeAIStatuses}
            onTogglePlatform={onTogglePlatform}
            viewMode="grid"
            onViewModeChange={() => {}}
          />
          
          <ChatModeSelector 
            currentMode={chatMode}
            onModeChange={onChatModeChange}
            isolatedMode={isolatedMode}
            onIsolatedToggle={onIsolatedToggle}
          />

          <ModeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
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
              <SheetTitle>Preferences</SheetTitle>
              <SheetDescription>
                Customize your chat experience.
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-4">
              <AgentViewToggle 
                platforms={platforms}
                activeAIStatuses={activeAIStatuses}
                onTogglePlatform={onTogglePlatform}
                viewMode="list"
                onViewModeChange={() => {}}
              />
              
              <ChatModeSelector 
                currentMode={chatMode}
                onModeChange={onChatModeChange}
                isolatedMode={isolatedMode}
                onIsolatedToggle={onIsolatedToggle}
                className="mt-4"
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
};

export default ChatHeader;
