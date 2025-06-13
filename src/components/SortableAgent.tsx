
import React from 'react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot, Brain, Search, Zap, Gem, GripVertical } from 'lucide-react';
import type { AIPlatform } from '@/types/chat';

interface SortableAgentProps {
  platform: AIPlatform;
  status: string;
  onPlatformClick: (platform: AIPlatform) => void;
}

const SortableAgent: React.FC<SortableAgentProps> = ({ platform, status, onPlatformClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: platform.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  const getStatusColor = (status: string, isEnabled: boolean) => {
    if (!isEnabled) return 'bg-gray-300';
    
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

  const getStatusAnimation = (status: string, isEnabled: boolean) => {
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

  const getVerboseStatus = (platform: AIPlatform, status?: string) => {
    if (!platform.enabled) {
      return `${platform.name} is disabled`;
    }
    
    if (!status) {
      return `${platform.name} is enabled and ready`;
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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEnabled) {
      console.log('Agent clicked:', platform.name);
      onPlatformClick(platform);
    }
  };

  const Icon = getPlatformIcon(platform.id);
  const isEnabled = platform.enabled && platform.hasApiKey;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 group ${!isEnabled ? 'opacity-50' : ''}`}
      {...attributes}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${isEnabled ? 'cursor-pointer' : 'cursor-not-allowed'} hover:bg-muted/50 p-2 rounded-md transition-colors`}>
            <div
              {...listeners}
              className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div 
              className="flex items-center gap-2"
              onClick={handleClick}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isEnabled ? 'text-muted-foreground' : 'text-gray-400'}`} />
                <div 
                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(status, isEnabled)} ${getStatusAnimation(status, isEnabled)}`}
                />
              </div>
              <Badge variant="outline" className={`text-xs ${!isEnabled ? 'bg-gray-100 text-gray-400 border-gray-300' : ''}`}>
                {platform.name}
              </Badge>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getVerboseStatus(platform, status)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isEnabled ? 'Click to view chat history • Drag to reorder' : 'Agent is disabled'}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SortableAgent;
