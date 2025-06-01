
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  platform?: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'seen';
  seenBy?: string[]; // platform IDs that have seen this message
  responses?: string[]; // message IDs of responses to this message
  roundNumber?: number; // Track which discussion round this message belongs to
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastUpdated: Date;
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
}
