
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
    }
  ],
  anthropic: [
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Fastest model for quick responses',
      maxTokens: 200000,
      costTier: 'low',
      capabilities: ['text', 'reasoning'],
      speed: 'fast'
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Balanced performance and capability',
      maxTokens: 200000,
      costTier: 'medium',
      capabilities: ['text', 'reasoning', 'coding', 'analysis'],
      speed: 'medium'
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
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
      id: 'grok-3',
      name: 'Grok 3',
      description: 'Latest generation model with enhanced capabilities',
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
    anthropic: 'claude-3-5-haiku-20241022',
    deepseek: 'deepseek-chat',
    grok: 'grok-3'
  };
  
  return defaults[platformId] || models[0].id;
};
