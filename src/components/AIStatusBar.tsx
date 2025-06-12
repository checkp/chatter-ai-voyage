
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot, Brain, Search, Zap, Gem, Grid3X3, Users } from 'lucide-react';
import type { AIPlatform, Chat, ChatMode } from '@/types/chat';
import BotHistoryDialog from './BotHistoryDialog';

interface AIStatusBarProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  currentChat?: Chat | null;
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSendMessage?: (message: string, platformId: string) => void;
}

const AIStatusBar: React.FC<AIStatusBarProps> = ({ 
  platforms, 
  activeAIStatuses, 
  currentChat,
  currentMode,
  onModeChange,
  onSendMessage 
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<AIPlatform | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      case 'google':
        return Gem;
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

  const handlePlatformClick = (platform: AIPlatform) => {
    setSelectedPlatform(platform);
    setIsDialogOpen(true);
  };

  const getViewIcon = (mode: ChatMode) => {
    switch (mode) {
      case 'discussion':
        return Users;
      case 'side-by-side':
        return Grid3X3;
      default:
        return Users;
    }
  };

  const getNextMode = (current: ChatMode): ChatMode => {
    const modes: ChatMode[] = ['discussion', 'side-by-side'];
    const currentIndex = modes.indexOf(current);
    return modes[(currentIndex + 1) % modes.length];
  };

  const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);

  if (enabledPlatforms.length === 0) {
    return null;
  }

  const ViewIcon = getViewIcon(currentMode);

  return (
    <>
      <div className="bg-secondary/50 border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
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
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                          onClick={() => handlePlatformClick(platform)}
                        >
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
                        <p className="text-xs text-muted-foreground mt-1">Click to view chat history</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">View:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onModeChange(getNextMode(currentMode))}
                  className="flex items-center gap-2"
                >
                  <ViewIcon className="h-4 w-4" />
                  <span className="hidden sm:inline capitalize">
                    {currentMode.replace('-', ' ')}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to switch view mode</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <BotHistoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        platform={selectedPlatform}
        currentChat={currentChat}
        onSendMessage={onSendMessage}
      />
    </>
  );
};

export default AIStatusBar;
