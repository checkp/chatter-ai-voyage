
import { Bot, Brain, Search, Zap, Gem, Wind, Globe, Sparkles } from 'lucide-react';

export const getPlatformIcon = (platformId: string) => {
  switch (platformId) {
    case 'openai':
      return Bot;
    case 'anthropic':
      return Brain;
    case 'deepseek':
      return Search;
    case 'grok':
      return Zap;
    case 'google':
      return Gem;
    case 'mistral':
      return Wind;
    case 'perplexity':
      return Globe;
    case 'qwen':
      return Sparkles;
    default:
      return Bot;
  }
};

export const getStatusColor = (status: string, isEnabled: boolean) => {
  if (!isEnabled) return 'bg-gray-400';
  
  switch (status) {
    case 'thinking':
      return 'bg-yellow-400';
    case 'responding':
      return 'bg-blue-400';
    case 'completed':
      return 'bg-green-400';
    case 'error':
      return 'bg-red-400';
    default:
      return 'bg-gray-400';
  }
};

export const getStatusAnimation = (status: string, isEnabled: boolean) => {
  if (!isEnabled) return '';
  
  switch (status) {
    case 'thinking':
      return 'animate-pulse';
    case 'responding':
      return 'animate-ping';
    case 'completed':
      return '';
    case 'error':
      return 'animate-bounce';
    default:
      return '';
  }
};
