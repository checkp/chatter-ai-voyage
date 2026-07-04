
import type { Chat, ChatMode, AIPlatform, Message } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface DesktopInterfaceProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  handleCreateChat: () => void;
  handleDeleteChat: (chatId: string) => void;
  createChatMutation: any;
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  isLoadingResponse: boolean;
  platforms: AIPlatform[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: SupabaseUser;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  handleStartFreeMode: () => void;
  stopFreeMode: () => void;
  updateMessageLimit: (limit: number) => void;
  handleSingleAgentMessage: (message: string, platformId: string) => Promise<void>;
  updateAgentOrder: (reorderedPlatforms: AIPlatform[]) => void;
  handleSignOut: () => void;
  activeChatMode: ChatMode;
  isolatedMode: boolean;
  handleChatModeChange: (mode: ChatMode) => void;
  handleIsolatedModeToggle: (isolated: boolean) => void;
  togglePlatform: (platformId: string) => void;
  selectLocalModel: (model: string | null) => void;
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
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>;
}
