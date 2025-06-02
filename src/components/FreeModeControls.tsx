
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  onUpdateLimit
}) => {
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      onUpdateLimit(value);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Play/Stop Button */}
      {!isFreeMode ? (
        <Button
          onClick={onStart}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          Free Mode
        </Button>
      ) : (
        <Button
          onClick={onStop}
          variant="destructive"
          size="sm"
          className="flex items-center gap-2"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      )}

      {/* Message Limit Input */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Limit:</span>
        <Input
          type="number"
          value={freeModeMessageLimit}
          onChange={handleLimitChange}
          disabled={isFreeModeRunning}
          className="w-20 h-8"
          min="1"
          max="1000"
        />
      </div>

      {/* Progress Badge */}
      {isFreeMode && (
        <Badge variant="outline" className="text-xs">
          {freeModeMessageCount}/{freeModeMessageLimit}
        </Badge>
      )}

      {/* Status Indicator */}
      {isFreeMode && (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isFreeModeRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">
            {isFreeModeRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      )}
    </div>
  );
};

export default FreeModeControls;
