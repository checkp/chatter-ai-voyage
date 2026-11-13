
import type { Chat, ChatMode, AIPlatform, Message } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { useConductor } from '@/hooks/useConductor';

/** Conductor state as returned by `useConductor`. */
export type ConductorStateView = ReturnType<typeof useConductor>['conductorState'];

/** Minimal shape of a TanStack `useMutation` result that the index components use. */
export interface CreateChatMutation {
  isPending: boolean;
  mutateAsync: (vars: {
    title: string;
    chatMode?: ChatMode;
    isolatedMode?: boolean;
  }) => Promise<{ id: string } | null | undefined>;
}

/** Minimal shape of the send-message mutation: only its pending flag is read by the layouts. */
export interface PendingMutation {
  isPending: boolean;
}

export interface DesktopInterfaceProps {
  chats: Chat[] | undefined;
  isLoadingChats: boolean;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  handleCreateChat: () => void;
  handleDeleteChat: (chatId: string) => void;
  createChatMutation: CreateChatMutation;
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
  currentChatWithMessages: (Chat & { messages: Message[] }) | null;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  input: string;
  setInput: (input: string) => void;
  handleSend: (activeChatId: string | null) => void;
  handleStop: () => void;
  sendMessageMutation: PendingMutation;
  canStop: boolean;
  getPendingCount: () => number;
  handleSendAndStartConversation: () => void;
  callAIAPI: (platform: AIPlatform, messages: Message[], enabledPlatforms: AIPlatform[]) => Promise<string>;
}
