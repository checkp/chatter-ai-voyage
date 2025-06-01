
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  platform?: string;
  created_at: string;
  conversation_id: string;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
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
