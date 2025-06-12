
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Menu, Settings, MessageSquare } from 'lucide-react';
import type { AIPlatform } from '@/types/chat';

interface MobileHeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
  activeView: 'chat' | 'settings';
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  onMenuClick,
  onSettingsClick,
  activeView,
  platforms,
  activeAIStatuses
}) => {
  const activeAgents = platforms.filter(p => p.enabled && p.hasApiKey);
  const busyAgents = activeAgents.filter(p => 
    activeAIStatuses[p.id] === 'thinking' || activeAIStatuses[p.id] === 'responding'
  );

  return (
    <header className="flex items-center justify-between p-4 bg-background border-b">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {activeView === 'chat' ? 'RoboHeard' : 'Settings'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* AI Status Indicator */}
        {busyAgents.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {busyAgents.length} AI{busyAgents.length > 1 ? 's' : ''} active
          </Badge>
        )}

        {/* View Toggle */}
        <Button
          variant={activeView === 'settings' ? 'default' : 'ghost'}
          size="icon"
          onClick={onSettingsClick}
        >
          {activeView === 'settings' ? (
            <MessageSquare className="h-5 w-5" />
          ) : (
            <Settings className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
};

export default MobileHeader;
