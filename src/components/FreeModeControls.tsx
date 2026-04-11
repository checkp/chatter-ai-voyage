
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Square } from 'lucide-react';

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
  onUpdateLimit,
}) => {
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 1000) {
      onUpdateLimit(value);
    }
  };

  return (
    <div className="flex items-center gap-2" data-tour="free-mode">
      {!isFreeModeRunning ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStart}
                className="h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start conversation mode</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="number"
                value={freeModeMessageLimit}
                onChange={handleLimitChange}
                min={1}
                max={1000}
                className="w-16 h-8 text-xs"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Message limit for conversation mode</p>
            </TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="h-8 w-8 p-0"
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop conversation mode</p>
            </TooltipContent>
          </Tooltip>
          
          <Badge variant="secondary" className="text-xs">
            {freeModeMessageCount}/{freeModeMessageLimit}
          </Badge>
        </>
      )}
    </div>
  );
};

export default FreeModeControls;
