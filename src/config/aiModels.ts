
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  costTier: 'low' | 'medium' | 'high';
  capabilities: string[];
  speed: 'fast' | 'medium' | 'slow';
}

export const AI_MODELS: Record<string, ModelConfig[]> = {
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Fast and cost-effective model for everyday tasks',
      maxTokens: 128000,
      costTier: 'low',
      capabilities: ['text', 'reasoning'],
      speed: 'fast'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Most capable model with multimodal abilities',
      maxTokens: 128000,
      costTier: 'high',
      capabilities: ['text', 'vision', 'reasoning', 'coding'],
      speed: 'medium'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'Previous generation flagship model',
      maxTokens: 128000,
      costTier: 'high',
      capabilities: ['text', 'reasoning', 'coding'],
      speed: 'medium'
    },
    {
      id: 'gpt-5',
      name: 'ChatGPT 5',
      description: 'Next-generation model with advanced multimodal reasoning',
      maxTokens: 200000,
      costTier: 'high',
      capabilities: ['text', 'vision', 'reasoning', 'coding', 'analysis'],
      speed: 'medium'
    }
  ],
  anthropic: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      description: 'Latest balanced model with strong reasoning',
      maxTokens: 200000,
      costTier: 'medium',
      capabilities: ['text', 'reasoning', 'coding', 'analysis'],
      speed: 'medium'
    },
    {
      id: 'claude-haiku-4-20250514',
      name: 'Claude Haiku 4',
      description: 'Fast and cost-effective model',
      maxTokens: 200000,
      costTier: 'low',
      capabilities: ['text', 'reasoning'],
      speed: 'fast'
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      description: 'Most powerful model for complex tasks',
      maxTokens: 200000,
      costTier: 'high',
      capabilities: ['text', 'reasoning', 'coding', 'analysis', 'creative'],
      speed: 'slow'
    }
  ],
  deepseek: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      description: 'General purpose conversational model',
      maxTokens: 32000,
      costTier: 'low',
      capabilities: ['text', 'reasoning', 'coding'],
      speed: 'fast'
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      description: 'Specialized coding and programming model',
      maxTokens: 32000,
      costTier: 'low',
      capabilities: ['coding', 'debugging', 'analysis'],
      speed: 'fast'
    }
  ],
  grok: [
    {
      id: 'grok-4',
      name: 'Grok 4',
      description: 'Next-generation model with advanced reasoning and real-time capabilities',
      maxTokens: 200000,
      costTier: 'high',
      capabilities: ['text', 'reasoning', 'real-time', 'analysis'],
      speed: 'medium'
    },
    {
      id: 'grok-4-heavy',
      name: 'Grok 4 Heavy',
      description: 'Most powerful Grok model for complex tasks and deep reasoning',
      maxTokens: 200000,
      costTier: 'high',
      capabilities: ['text', 'reasoning', 'real-time', 'analysis', 'complex-tasks'],
      speed: 'slow'
    },
    {
      id: 'grok-3',
      name: 'Grok 3',
      description: 'Previous generation model with enhanced capabilities',
      maxTokens: 128000,
      costTier: 'high',
      capabilities: ['text', 'reasoning', 'real-time'],
      speed: 'medium'
    },
    {
      id: 'grok-3-mini',
      name: 'Grok 3 Mini',
      description: 'Smaller, faster version of Grok 3',
      maxTokens: 64000,
      costTier: 'medium',
      capabilities: ['text', 'reasoning'],
      speed: 'fast'
    },
    {
      id: 'grok-3-fast',
      name: 'Grok 3 Fast',
      description: 'Optimized for speed and quick responses',
      maxTokens: 32000,
      costTier: 'low',
      capabilities: ['text', 'reasoning'],
      speed: 'fast'
    },
    {
      id: 'grok-3-mini-fast',
      name: 'Grok 3 Mini Fast',
      description: 'Ultra-fast lightweight model',
      maxTokens: 16000,
      costTier: 'low',
      capabilities: ['text'],
      speed: 'fast'
    },
    {
      id: 'grok-2-vision-1212',
      name: 'Grok 2 Vision',
      description: 'Previous generation with vision capabilities',
      maxTokens: 64000,
      costTier: 'medium',
      capabilities: ['text', 'vision', 'reasoning'],
      speed: 'medium'
    },
    {
      id: 'grok-2-1212',
      name: 'Grok 2',
      description: 'Previous generation general model',
      maxTokens: 64000,
      costTier: 'medium',
      capabilities: ['text', 'reasoning'],
      speed: 'medium'
    }
  ],
  google: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Fast and efficient model for everyday tasks',
      maxTokens: 1000000,
      costTier: 'low',
      capabilities: ['text', 'reasoning', 'vision'],
      speed: 'fast'
    },
    {
      id: 'gemini-2.5-pro-preview-06-05',
      name: 'Gemini 2.5 Pro',
      description: 'Most capable model with advanced reasoning',
      maxTokens: 1000000,
      costTier: 'medium',
      capabilities: ['text', 'reasoning', 'vision', 'coding', 'analysis'],
      speed: 'medium'
    }
  ]
};

export const getModelConfig = (platformId: string, modelId: string): ModelConfig | undefined => {
  return AI_MODELS[platformId]?.find(model => model.id === modelId);
};

export const getDefaultModel = (platformId: string): string => {
  const models = AI_MODELS[platformId];
  if (!models || models.length === 0) return '';
  
  const defaults: Record<string, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-sonnet-4-20250514',
    deepseek: 'deepseek-chat',
    grok: 'grok-4',
    google: 'gemini-2.0-flash'
  };
  
  return defaults[platformId] || models[0].id;
};
