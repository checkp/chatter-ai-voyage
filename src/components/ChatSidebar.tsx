
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

interface Chat {
  id: string;
  title: string;
  messageCount?: number;
  messages?: any[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

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
    <aside className="w-72 border-r bg-card/50 backdrop-blur-sm border-border/40 flex flex-col h-full shadow-sm">
      <div className="p-4 flex items-center justify-between flex-shrink-0 border-b border-border/20">
        <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Conversations</h2>
        <ModeToggle />
      </div>

      <div className="p-3 flex-shrink-0">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200 font-medium" 
          onClick={onCreateChat}
          disabled={isCreatingChat}
        >
          <Plus className="w-4 h-4" />
          {isCreatingChat ? 'Creating...' : 'New Conversation'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-1">
          {isLoadingChats && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          )}
          {!isLoadingChats && (!chats || chats.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start a new conversation to get started</p>
            </div>
          )}
          {!isLoadingChats && chats?.map((chat) => (
            <div
              key={chat.id}
              className={`group relative flex items-center rounded-lg transition-all duration-200 hover:bg-accent/60 ${
                activeChatId === chat.id ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-border/50' : ''
              }`}
            >
              <Button
                variant="ghost"
                className="flex-1 justify-start rounded-lg h-auto py-3 px-3 text-left hover:bg-transparent"
                onClick={() => setActiveChatId(chat.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0"></div>
                    <span className="font-medium text-sm truncate pr-8">{chat.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    {chat.messageCount !== undefined ? chat.messageCount : (chat.messages?.length || 0)} messages
                  </div>
                </div>
              </Button>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-lg">Delete Conversation</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm">
                        Are you sure you want to delete "<span className="font-medium">{chat.title}</span>"? This action cannot be undone and will permanently delete the conversation and all its messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default ChatSidebar;
