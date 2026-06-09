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
      <div className="px-4 py-3">
        <Button 
          variant="outline"
          onClick={onCreateChat} 
          className="w-full rounded-md bg-primary/10 border-primary/20 text-foreground hover:bg-primary/20 hover:border-primary/30 transition-all"
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
            <div className="space-y-0">
              {chats?.filter(chat => !chat.title.startsWith('Conductor: ')).map((chat, idx, arr) => {
                const seed = chat.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const targetWidth = 90; // px, consistent line length
                const dotW = 2, dashW = 10, gap = 4;
                const marks: ('dot' | 'dash')[] = [];
                let used = 0;
                let i = 0;
                while (used < targetWidth) {
                  const v = (seed * (i + 7)) % 5;
                  const m: 'dot' | 'dash' = v < 2 ? 'dot' : 'dash';
                  const w = m === 'dot' ? dotW : dashW;
                  if (used + w > targetWidth) break;
                  marks.push(m);
                  used += w + gap;
                  i++;
                }
                return (
                  <React.Fragment key={chat.id}>
                    <div
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
                    {idx < arr.length - 1 && (
                      <div className="flex items-center px-3 py-0.5 select-none" aria-hidden="true">
                        {marks.map((m, i) => (
                          <span
                            key={i}
                            className="inline-block rounded-full"
                            style={{
                              backgroundColor: 'hsl(70 22% 32% / 0.6)',
                              height: '2px',
                              width: m === 'dot' ? '2px' : '8px',
                              marginRight: i === marks.length - 1 ? 0 : '3px',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default ChatSidebar;
