
import React from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Eye, EyeOff, Grid3X3, MessageSquare } from 'lucide-react';
import type { AIPlatform } from '@/types/chat';

interface AgentViewToggleProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  onTogglePlatform: (platformId: string) => void;
  onAgentClick?: (platform: AIPlatform) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

const AgentViewToggle: React.FC<AgentViewToggleProps> = ({
  platforms,
  activeAIStatuses,
  onTogglePlatform,
  onAgentClick,
  viewMode,
  onViewModeChange
}) => {
  const enabledPlatforms = platforms.filter(p => p.enabled && p.hasApiKey);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'thinking':
        return 'bg-yellow-500';
      case 'responding':
        return 'bg-blue-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-green-500';
    }
  };

  const getPlatformColor = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return 'bg-[#8FBC8F]';
      case 'anthropic':
        return 'bg-[#98D982]';
      case 'deepseek':
        return 'bg-[#87CEEB]';
      case 'grok':
        return 'bg-[#DDA0DD]';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* View Mode Toggle */}
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(value) => value && onViewModeChange(value as 'grid' | 'list')}
        className="gap-1"
      >
        <ToggleGroupItem value="grid" className="p-2" title="Grid View">
          <Grid3X3 className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" className="p-2" title="List View">
          <MessageSquare className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Agent Buttons */}
      <div className={`flex gap-2 ${viewMode === 'grid' ? 'flex-wrap' : 'flex-row'}`}>
        {enabledPlatforms.map((platform) => {
          const status = activeAIStatuses[platform.id] || 'completed';
          const isActive = platform.enabled;
          
          return (
            <div key={platform.id} className="relative">
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`relative flex items-center gap-2 ${
                  viewMode === 'grid' ? 'min-w-[80px]' : 'min-w-[100px]'
                }`}
                style={{
                  backgroundColor: isActive ? getPlatformColor(platform.id) : undefined,
                  borderColor: getPlatformColor(platform.id),
                }}
                onClick={() => onAgentClick?.(platform)}
              >
                <span className={`text-xs font-medium ${
                  isActive ? 'text-white' : 'text-foreground'
                }`}>
                  {platform.name}
                </span>
                
                {/* Status Indicator */}
                <div 
                  className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}
                  title={status}
                />
                
                {/* Toggle Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full bg-background border shadow-sm hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePlatform(platform.id);
                  }}
                  title={isActive ? 'Disable agent' : 'Enable agent'}
                >
                  {isActive ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default AgentViewToggle;
