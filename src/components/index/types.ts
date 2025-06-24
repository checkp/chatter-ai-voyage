
import type { Chat, ChatMode, AIPlatform } from '@/types/chat';
import type { User } from '@supabase/supabase-js';

export interface DesktopInterfaceProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  activeChatId: string | null;
  setActiveChatId: (chatId: string) => void;
  handleCreateChat: (chatMode?: ChatMode) => void;
  handleDeleteChat: (chatId: string) => void;
  createChatMutation: any;
  messages: any;
  isLoadingMessages: boolean;
  isLoadingResponse: boolean;
  platforms: AIPlatform[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  handleStartFreeMode: () => void;
  stopFreeMode: () => void;
  updateMessageLimit: (limit: number) => void;
  handleSingleAgentMessage: (message: string, platformId: string) => Promise<void>;
  updateAgentOrder: (platforms: AIPlatform[]) => void;
  handleSignOut: () => void;
  activeChatMode: ChatMode;
  isolatedMode: boolean;
  handleChatModeChange: (mode: ChatMode) => void;
  handleIsolatedModeToggle: (isolated: boolean) => void;
  togglePlatform: (platformId: string) => void;
  transformedStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  currentChatWithMessages: any;
  scrollAreaRef: React.RefObject<any>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  input: string;
  setInput: (input: string) => void;
  handleSend: (activeChatId: string | null) => void;
  handleStop: () => void;
  sendMessageMutation: any;
  canStop: boolean;
  getPendingCount: () => number;
  handleSendAndStartConversation: () => void;
}
