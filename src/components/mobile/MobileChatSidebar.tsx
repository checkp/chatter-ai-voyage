
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Chat } from '@/types/chat';

interface MobileChatSidebarProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isCreatingChat: boolean;
}

const MobileChatSidebar: React.FC<MobileChatSidebarProps> = ({
  chats,
  isLoadingChats,
  activeChatId,
  onChatSelect,
  onCreateChat,
  onDeleteChat,
  isCreatingChat
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Button
          onClick={onCreateChat}
          disabled={isCreatingChat}
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoadingChats ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading chats...
            </div>
          ) : chats && chats.length > 0 ? (
            chats.map((chat, index) => (
              <React.Fragment key={chat.id}>
                <div
                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                    activeChatId === chat.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onChatSelect(chat.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {chat.title}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(chat.created_at)}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {activeChatId === chat.id && (
                    <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                
                {/* Add separator between chat items, but not after the last one */}
                {index < chats.length - 1 && (
                  <Separator className="my-2" />
                )}
              </React.Fragment>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs mt-1">Create your first chat to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MobileChatSidebar;
