import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from 'lucide-react';
import { Chat } from '@/types/chat';
import Logo from './Logo';

interface ChatSidebarProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  activeChatId: string | null;
  setActiveChatId: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isCreatingChat: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  isLoadingChats,
  activeChatId,
  setActiveChatId,
  onCreateChat,
  onDeleteChat,
  isCreatingChat
}) => {
  return (
    <aside className="w-64 bg-secondary border-r border-border flex flex-col h-full">
      {/* Header with Logo */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Logo size="sm" />
        <h2 className="font-semibold text-foreground">RoboHeard</h2>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          onClick={onCreateChat} 
          className="w-full"
          disabled={isCreatingChat}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isCreatingChat ? 'Creating...' : 'New Chat'}
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoadingChats ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {chats?.filter(chat => !chat.title.startsWith('Conductor: ')).map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    activeChatId === chat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <span className="truncate flex-1 text-sm">
                    {chat.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 ${
                      activeChatId === chat.id 
                        ? 'text-primary-foreground hover:text-primary-foreground/80' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default ChatSidebar;
