
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import type { AIPlatform } from '@/types/chat';

interface PlatformStatusProps {
  platform: AIPlatform;
  status: 'idle' | 'thinking' | 'responding' | 'completed' | 'error';
  error?: string;
}

const PlatformStatus: React.FC<PlatformStatusProps> = ({ platform, status, error }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'thinking':
        return <Clock className="w-3 h-3 animate-pulse" />;
      case 'responding':
        return <Zap className="w-3 h-3 animate-bounce" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'thinking':
        return 'modern-text-accent border-amber-300';
      case 'responding':
        return `${
          platform.id === 'openai' ? 'modern-border-agent-openai modern-agent-openai' :
          platform.id === 'anthropic' ? 'modern-border-agent-anthropic modern-agent-anthropic' :
          platform.id === 'deepseek' ? 'modern-border-agent-deepseek modern-agent-deepseek' :
          platform.id === 'grok' ? 'modern-border-agent-grok modern-agent-grok' :
          'modern-text-accent border-amber-300'
        }`;
      case 'completed':
        return 'text-green-600 border-green-300';
      case 'error':
        return 'text-red-600 border-red-300';
      default:
        return 'modern-text-muted modern-border';
    }
  };

  if (status === 'idle') return null;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs modern-glow-hover transition-all duration-300 ${getStatusColor()}`}
      title={error || status}
    >
      {getStatusIcon()}
      <span className="ml-1 capitalize font-medium">{status}</span>
    </Badge>
  );
};

export default PlatformStatus;
