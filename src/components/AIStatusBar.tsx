
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot, Brain, Search, Zap } from 'lucide-react';
import type { AIPlatform } from '@/types/chat';

interface AIStatusBarProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
}

const AIStatusBar: React.FC<AIStatusBarProps> = ({ platforms, activeAIStatuses }) => {
  const getPlatformIcon = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return Bot;
      case 'anthropic':
        return Brain;
      case 'deepseek':
        return Search;
      case 'grok':
        return Zap;
      default:
        return Bot;
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusAnimation = (status: string) => {
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

  const getVerboseStatus = (platform: AIPlatform, status?: string) => {
    if (!status) {
      return `${platform.name} is ${platform.enabled ? 'enabled and ready' : 'disabled'}`;
    }

    switch (status) {
      case 'thinking':
        return `${platform.name} is analyzing your message and preparing a response...`;
      case 'responding':
        return `${platform.name} is actively generating a response for you`;
      case 'completed':
        return `${platform.name} has successfully completed its response`;
      case 'error':
        return `${platform.name} encountered an error while processing your request`;
      default:
        return `${platform.name} status: ${status}`;
    }
  };

  const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);

  if (enabledPlatforms.length === 0) {
    return null;
  }

  return (
    <div className="bg-secondary/50 border-b border-border px-4 py-2">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">AI Agents:</span>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            {enabledPlatforms.map((platform) => {
              const status = activeAIStatuses[platform.id];
              const Icon = getPlatformIcon(platform.id);
              
              return (
                <Tooltip key={platform.id}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div 
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(status || 'idle')} ${getStatusAnimation(status || 'idle')}`}
                        />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {platform.name}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">{getVerboseStatus(platform, status)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default AIStatusBar;
