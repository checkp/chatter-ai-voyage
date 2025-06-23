
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Square, MessageCircle, Settings } from 'lucide-react';

interface FreeModeControlsProps {
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  freeModeMessageLimit: number;
  freeModeMessageCount: number;
  onStart: () => void;
  onStop: () => void;
  onUpdateLimit: (limit: number) => void;
}

const FreeModeControls: React.FC<FreeModeControlsProps> = ({
  isFreeMode,
  isFreeModeRunning,
  freeModeMessageLimit,
  freeModeMessageCount,
  onStart,
  onStop,
  onUpdateLimit
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Counter Badge */}
      {isFreeMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isFreeModeRunning ? "default" : "secondary"}
              className="flex items-center gap-1 text-xs font-mono"
            >
              <MessageCircle className="h-3 w-3" />
              {freeModeMessageCount}/{freeModeMessageLimit}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conversation mode: {freeModeMessageCount} of {freeModeMessageLimit} messages</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Control Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isFreeModeRunning ? "destructive" : "outline"}
            size="icon"
            onClick={isFreeModeRunning ? onStop : onStart}
            className="h-8 w-8"
          >
            {isFreeModeRunning ? (
              <Square className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isFreeModeRunning 
              ? 'Stop conversation mode' 
              : 'Start conversation mode - agents will discuss autonomously'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default FreeModeControls;
