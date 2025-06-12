
import React from 'react';
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
import { GripVertical, Bot, Brain, Search, Zap, Gem } from 'lucide-react';
import type { AIPlatform } from '@/types/chat';

interface DraggableAIStatusBarProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  onReorder: (reorderedPlatforms: AIPlatform[]) => void;
  onAgentClick: (platform: AIPlatform) => void;
}

interface SortableAgentProps {
  platform: AIPlatform;
  status: string;
  onAgentClick: (platform: AIPlatform) => void;
}

const SortableAgent: React.FC<SortableAgentProps> = ({ platform, status, onAgentClick }) => {
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

  const Icon = getPlatformIcon(platform.id);
  const isEnabled = platform.enabled && platform.hasApiKey;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 group ${!isEnabled ? 'opacity-60' : ''}`}
      {...attributes}
    >
      <div
        {...listeners}
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing hover:bg-muted/50 p-1 rounded transition-colors"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="flex items-center gap-2" onClick={() => isEnabled && onAgentClick(platform)}>
        <div className="relative">
          <Icon className={`w-4 h-4 ${isEnabled ? 'text-muted-foreground' : 'text-gray-400'}`} />
          <div 
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(status, isEnabled)} ${getStatusAnimation(status, isEnabled)}`}
          />
        </div>
        <Badge 
          variant="outline"
          className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${
            !isEnabled ? 'bg-gray-100 text-gray-400 border-gray-300' :
            status === 'thinking' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
            status === 'responding' ? 'bg-blue-100 text-blue-800 border-blue-300' :
            status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
            status === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
            'text-muted-foreground'
          }`}
        >
          {platform.name}: {isEnabled ? status : 'disabled'}
        </Badge>
      </div>
    </div>
  );
};

const DraggableAIStatusBar: React.FC<DraggableAIStatusBarProps> = ({
  platforms,
  activeAIStatuses,
  onReorder,
  onAgentClick,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Show all platforms with API keys, sorted by display order
  const sortedPlatforms = platforms
    .filter(p => p.hasApiKey)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedPlatforms.findIndex(p => p.id === active.id);
      const newIndex = sortedPlatforms.findIndex(p => p.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedPlatforms = arrayMove(sortedPlatforms, oldIndex, newIndex);
        onReorder(reorderedPlatforms);
      }
    }
  };

  if (sortedPlatforms.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground">AI Agents:</span>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedPlatforms.map(p => p.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {sortedPlatforms.map((platform) => {
              const status = activeAIStatuses[platform.id] || 'idle';
              
              return (
                <SortableAgent
                  key={platform.id}
                  platform={platform}
                  status={status}
                  onAgentClick={onAgentClick}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default DraggableAIStatusBar;
