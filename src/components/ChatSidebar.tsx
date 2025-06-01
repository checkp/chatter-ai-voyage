
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from '@/components/ModeToggle';
import { Plus, Trash2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Chat } from '@/types/chat';

interface ChatSidebarProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  activeChatId: string | null;
  setActiveChatId: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat?: (chatId: string) => void;
  isCreatingChat?: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  isLoadingChats,
  activeChatId,
  setActiveChatId,
  onCreateChat,
  onDeleteChat,
  isCreatingChat = false
}) => {
  const handleDeleteChat = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDeleteChat) {
      onDeleteChat(chatId);
    }
  };

  return (
    <aside className="w-64 border-r bg-secondary border-border flex flex-col h-full">
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold">Chats</h2>
        <ModeToggle />
      </div>

      <Button 
        variant="ghost" 
        className="justify-start rounded-none hover:bg-accent hover:text-accent-foreground flex-shrink-0" 
        onClick={onCreateChat}
        disabled={isCreatingChat}
      >
        <Plus className="w-4 h-4 mr-2" />
        {isCreatingChat ? 'Creating...' : 'New Chat'}
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
            <div
              key={chat.id}
              className={`group flex items-center hover:bg-accent hover:text-accent-foreground ${
                activeChatId === chat.id ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Button
                variant="ghost"
                className="flex-1 justify-start rounded-none h-auto py-2 px-4"
                onClick={() => setActiveChatId(chat.id)}
              >
                <span className="truncate">{chat.title}</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 mr-2 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{chat.title}"? This action cannot be undone and will permanently delete the chat and all its messages.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default ChatSidebar;
