
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bot, Brain, Search, Zap, Gem, Grid3X3, Users, GripVertical } from 'lucide-react';
import type { AIPlatform, Chat, ChatMode } from '@/types/chat';
import BotHistoryDialog from './BotHistoryDialog';

interface AIStatusBarProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  currentChat?: Chat | null;
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSendMessage?: (message: string, platformId: string) => void;
  onUpdateAgentOrder?: (reorderedPlatforms: AIPlatform[]) => void;
}

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
          <div className={`flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors ${!isEnabled ? 'cursor-not-allowed' : ''}`}>
            <div
              {...listeners}
              className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div 
              className="flex items-center gap-2"
              onClick={() => isEnabled && onPlatformClick(platform)}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isEnabled ? 'text-muted-foreground' : 'text-gray-400'}`} />
                <div 
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(status, isEnabled)} ${getStatusAnimation(status, isEnabled)}`}
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

const AIStatusBar: React.FC<AIStatusBarProps> = ({ 
  platforms, 
  activeAIStatuses, 
  currentChat,
  currentMode,
  onModeChange,
  onSendMessage,
  onUpdateAgentOrder
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<AIPlatform | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePlatformClick = (platform: AIPlatform) => {
    if (platform.enabled && platform.hasApiKey) {
      setSelectedPlatform(platform);
      setIsDialogOpen(true);
    }
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && onUpdateAgentOrder) {
      console.log('Drag end - reordering agents');
      
      // Sort platforms by display order for consistent ordering
      const sortedPlatforms = [...platforms]
        .filter(p => p.hasApiKey)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      
      const oldIndex = sortedPlatforms.findIndex(p => p.id === active.id);
      const newIndex = sortedPlatforms.findIndex(p => p.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedPlatforms = arrayMove(sortedPlatforms, oldIndex, newIndex);
        console.log('Calling onUpdateAgentOrder with:', reorderedPlatforms.map(p => p.name));
        onUpdateAgentOrder(reorderedPlatforms);
      }
    }
  };

  // Show all platforms with API keys, sorted by display order - both enabled and disabled
  const sortedPlatforms = [...platforms]
    .filter(p => p.hasApiKey)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (sortedPlatforms.length === 0) {
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedPlatforms.map(p => p.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {sortedPlatforms.map((platform) => {
                      const status = activeAIStatuses[platform.id];
                      
                      return (
                        <SortableAgent
                          key={platform.id}
                          platform={platform}
                          status={status || 'idle'}
                          onPlatformClick={handlePlatformClick}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
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
