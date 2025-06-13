
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3, Users } from 'lucide-react';
import type { ChatMode } from '@/types/chat';

interface ViewModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ currentMode, onModeChange }) => {
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

  const ViewIcon = getViewIcon(currentMode);

  return (
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
  );
};

export default ViewModeSelector;
