export type ChatMode = 'discussion' | 'isolated' | 'side-by-side' | 'conductor' | 'build';

/** Declared as a type alias (not an interface) so it is assignable to the Supabase `Json` column type. */
export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** Inline base64 data URL (data:image/png;base64,...). Only path used in v1. */
  dataUrl: string;
  /** Optional natural width/height for image attachments (used for thumbnail layout). */
  width?: number;
  height?: number;
};

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  /** Agent id; null for private user messages that no agent produced. */
  platform?: string | null;
  created_at: string;
  conversation_id: string;
  timestamp?: Date;
  status?: 'sending' | 'sent' | 'seen';
  seenBy?: string[];
  roundNumber?: number;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  chat_mode?: ChatMode;
  isolated_mode?: boolean;
  messages?: Message[];
  createdAt?: Date;
  lastUpdated?: Date;
}

export interface AIPlatform {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  icon: string;
  hasApiKey?: boolean;
  endpoint?: string;
  selectedModel?: string;
  displayOrder?: number;
  customInstructions?: string;
}
