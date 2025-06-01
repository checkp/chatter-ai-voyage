
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
        return 'border-pastel-accent text-pastel-accent';
      case 'responding':
        return `border-agent-${platform.id} text-agent-${platform.id}`;
      case 'completed':
        return 'border-pastel-secondary text-pastel-secondary';
      case 'error':
        return 'border-pastel-danger text-pastel-danger';
      default:
        return 'border-pastel-muted text-pastel-muted';
    }
  };

  if (status === 'idle') return null;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${getStatusColor()} transition-all duration-200`}
      title={error || status}
    >
      {getStatusIcon()}
      <span className="ml-1 capitalize">{status}</span>
    </Badge>
  );
};

export default PlatformStatus;
