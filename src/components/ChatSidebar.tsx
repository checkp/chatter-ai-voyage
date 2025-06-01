
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from '@/components/ModeToggle';
import { Plus } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton"
import type { Chat } from '@/types/chat';

interface ChatSidebarProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  activeChatId: string | null;
  setActiveChatId: (id: string) => void;
  setIsNewChatDrawerOpen: (open: boolean) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  isLoadingChats,
  activeChatId,
  setActiveChatId,
  setIsNewChatDrawerOpen
}) => {
  return (
    <aside className="w-64 border-r bg-secondary border-border flex flex-col h-full">
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold">Chats</h2>
        <ModeToggle />
      </div>

      <Button 
        variant="ghost" 
        className="justify-start rounded-none hover:bg-accent hover:text-accent-foreground flex-shrink-0" 
        onClick={() => setIsNewChatDrawerOpen(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        New Chat
      </Button>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {isLoadingChats && (
            <div className="px-4 py-2">
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          {!isLoadingChats && (!chats || chats.length === 0) && (
            <div className="px-4 py-2 text-center text-muted-foreground">
              <p className="text-sm">Creating your first chat...</p>
            </div>
          )}
          {!isLoadingChats && chats?.map((chat) => (
            <Button
              key={chat.id}
              variant="ghost"
              className={`w-full justify-start rounded-none hover:bg-accent hover:text-accent-foreground ${
                activeChatId === chat.id ? 'bg-accent text-accent-foreground' : ''
              }`}
              onClick={() => setActiveChatId(chat.id)}
            >
              {chat.title}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default ChatSidebar;
