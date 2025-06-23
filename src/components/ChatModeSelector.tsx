
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MessageCircle, Users, Grid3X3, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ChatMode, AIPlatform } from '@/types/chat';

interface ChatModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  isolatedMode: boolean;
  onIsolatedToggle: (isolated: boolean) => void;
  conductorPlatform?: string | null;
  onConductorPlatformChange?: (platformId: string | null) => void;
  availablePlatforms?: AIPlatform[];
  className?: string;
}

const ChatModeSelector: React.FC<ChatModeSelectorProps> = ({
  currentMode,
  onModeChange,
  isolatedMode,
  onIsolatedToggle,
  conductorPlatform,
  onConductorPlatformChange,
  availablePlatforms = [],
  className = ''
}) => {
  const isMobile = useIsMobile();

  const modes = [
    {
      value: 'discussion' as ChatMode,
      label: 'Discussion',
      icon: Users,
      description: 'Standard chat view'
    },
    {
      value: 'conductor' as ChatMode,
      label: 'Conductor',
      icon: Crown,
      description: 'AI-moderated discussion with summaries'
    },
    {
      value: 'side-by-side' as ChatMode,
      label: 'Side-by-Side',
      icon: Grid3X3,
      description: 'Separate windows (desktop only)',
      disabled: isMobile
    }
  ];

  const enabledPlatforms = availablePlatforms.filter(p => p.enabled && p.hasApiKey);

  return (
    <TooltipProvider>
      <div className={`flex flex-col gap-4 ${className}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">View:</span>
            <ToggleGroup 
              type="single" 
              value={currentMode} 
              onValueChange={(value) => value && onModeChange(value as ChatMode)}
              className="gap-1"
            >
              {modes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <Tooltip key={mode.value}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem 
                        value={mode.value}
                        disabled={mode.disabled}
                        className="flex items-center gap-2 px-3 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-input hover:bg-accent hover:text-accent-foreground"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden xl:inline">{mode.label}</span>
                        {mode.value === 'conductor' && currentMode === 'conductor' && (
                          <Badge variant="secondary" className="text-xs ml-1">
                            {conductorPlatform ? 'Active' : 'Setup'}
                          </Badge>
                        )}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{mode.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="isolated-mode" 
                    checked={isolatedMode}
                    onCheckedChange={onIsolatedToggle}
                    disabled={currentMode === 'conductor'}
                  />
                  <Label htmlFor="isolated-mode" className="text-sm font-medium text-muted-foreground cursor-pointer">
                    Isolated
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enable isolated mode for separate AI conversations</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Conductor Settings */}
        {currentMode === 'conductor' && (
          <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border">
            <Crown className="h-5 w-5 text-amber-500" />
            <div className="flex items-center gap-3 flex-1">
              <Label className="text-sm font-medium">Conductor:</Label>
              <Select 
                value={conductorPlatform || ''} 
                onValueChange={(value) => onConductorPlatformChange?.(value || null)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select conductor AI" />
                </SelectTrigger>
                <SelectContent>
                  {enabledPlatforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      <div className="flex items-center gap-2">
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              The conductor will moderate the discussion and provide summaries
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ChatModeSelector;
