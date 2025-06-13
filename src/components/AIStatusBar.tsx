
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
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AIPlatform, Chat, ChatMode } from '@/types/chat';
import BotHistoryDialog from './BotHistoryDialog';
import SortableAgent from './AIStatusBar/SortableAgent';

interface AIStatusBarProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  currentChat?: Chat | null;
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSendMessage?: (message: string, platformId: string) => void;
  onUpdateAgentOrder?: (reorderedPlatforms: AIPlatform[]) => void;
}

const AIStatusBar: React.FC<AIStatusBarProps> = ({ 
  platforms, 
  activeAIStatuses, 
  currentChat,
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

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-amber-700">AI Agents:</span>
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
