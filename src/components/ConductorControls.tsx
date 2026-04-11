
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain, BrainCircuit, Lightbulb } from 'lucide-react';

interface ConductorControlsProps {
  isActive: boolean;
  isAnalyzing: boolean;
  conversationCount: number;
  lastSummary: string | null;
  onStart: () => void;
  onStop: () => void;
  onRequestDirection: () => void;
}

const ConductorControls: React.FC<ConductorControlsProps> = ({
  isActive,
  isAnalyzing,
  conversationCount,
  lastSummary,
  onStart,
  onStop,
  onRequestDirection
}) => {
  return (
    <div className="flex items-center gap-2" data-tour="conductor-controls">
      {/* Conductor Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={isActive ? onStop : onStart}
            className="h-8 w-8 p-0"
          >
            {isActive ? (
              <BrainCircuit className="h-4 w-4" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isActive ? 'Deactivate' : 'Activate'} Conductor AI</p>
        </TooltipContent>
      </Tooltip>

      {/* Request Direction Button */}
      {isActive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRequestDirection}
              disabled={isAnalyzing}
              className="h-8 w-8 p-0"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Request conductor guidance</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Status Indicators */}
      {isActive && (
        <>
          {isAnalyzing && (
            <Badge variant="secondary" className="text-xs">
              Analyzing...
            </Badge>
          )}
          
          {conversationCount > 0 && !isAnalyzing && (
            <Badge variant="outline" className="text-xs">
              {conversationCount} analyses
            </Badge>
          )}
        </>
      )}
    </div>
  );
};

export default ConductorControls;
