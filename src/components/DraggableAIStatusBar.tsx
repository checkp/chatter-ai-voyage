
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
import type { AIPlatform, Chat } from '@/types/chat';
import BotHistoryDialog from './BotHistoryDialog';
import SortableAgent from './ai-status/SortableAgent';

interface DraggableAIStatusBarProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  onReorder: (reorderedPlatforms: AIPlatform[]) => void;
  onAgentClick?: (platform: AIPlatform) => void;
  onToggleEnabled?: (platformId: string) => void;
  currentChat?: Chat | null;
  onSendMessage?: (message: string, platformId: string) => void;
}

const DraggableAIStatusBar: React.FC<DraggableAIStatusBarProps> = ({
  platforms,
  activeAIStatuses,
  onReorder,
  onAgentClick,
  onToggleEnabled,
  currentChat,
  onSendMessage,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<AIPlatform | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handlePlatformClick = (platform: AIPlatform) => {
    if (platform.enabled && platform.hasApiKey) {
      // Close any existing dialog first
      setIsDialogOpen(false);
      setSelectedPlatform(null);
      
      // Then open the new dialog
      setTimeout(() => {
        setSelectedPlatform(platform);
        setIsDialogOpen(true);
      }, 100);
      
      // Also call the external onAgentClick if provided
      if (onAgentClick) {
        onAgentClick(platform);
      }
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedPlatform(null);
    }
  };

  if (sortedPlatforms.length === 0) {
    return null;
  }

  return (
    <>
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
                    onAgentClick={handlePlatformClick}
                    onToggleEnabled={onToggleEnabled}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {selectedPlatform && (
        <BotHistoryDialog
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          platform={selectedPlatform}
          currentChat={currentChat}
          onSendMessage={onSendMessage}
        />
      )}
    </>
  );
};

export default DraggableAIStatusBar;
