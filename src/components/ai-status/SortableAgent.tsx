
import React from 'react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import type { AIPlatform } from '@/types/chat';
import { getPlatformIcon, getStatusColor, getStatusAnimation } from './StatusBarUtils';

interface SortableAgentProps {
  platform: AIPlatform;
  status: string;
  onAgentClick: (platform: AIPlatform) => void;
  onToggleEnabled?: (platformId: string) => void;
}

const SortableAgent: React.FC<SortableAgentProps> = ({ platform, status, onAgentClick, onToggleEnabled }) => {
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

  const Icon = getPlatformIcon(platform.id);
  const isEnabled = platform.enabled && platform.hasApiKey;

  const handleBadgeClick = (e: React.MouseEvent) => {
    if (!isDragging && isEnabled) {
      onAgentClick(platform);
    }
  };

  const handleIconToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;
    if (!platform.hasApiKey) return; // can't toggle without an API key
    onToggleEnabled?.(platform.id);
  };

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
        <GripVertical className="w-3 h-3 text-foreground/80 group-hover:text-foreground transition-colors" />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleIconToggle}
            title={`${platform.name}: click to ${platform.enabled ? 'disable' : 'enable'}`}
            disabled={!platform.hasApiKey}
            className={`p-0.5 rounded hover:bg-muted/60 transition-colors ${!platform.hasApiKey ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon className={`w-4 h-4 ${isEnabled ? 'text-muted-foreground' : 'text-gray-400'}`} />
          </button>
          <div
            className={`w-2 h-2 rounded-full ${getStatusColor(status, isEnabled)} ${getStatusAnimation(status, isEnabled)}`}
          />
        </div>
        <Badge
          variant="outline"
          onClick={handleBadgeClick}
          title={`${platform.name}: ${isEnabled ? status : 'disabled'}`}
          className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${
            !isEnabled ? 'bg-gray-100 text-gray-400 border-gray-300' :
            status === 'thinking' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
            status === 'responding' ? 'bg-blue-100 text-blue-800 border-blue-300' :
            status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
            status === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
            'text-muted-foreground'
          }`}
        >
          {platform.name}
        </Badge>
      </div>
    </div>
  );
};

export default SortableAgent;
