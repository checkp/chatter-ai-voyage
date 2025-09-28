
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
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
    <TooltipProvider>
      <header className="flex items-center justify-between p-4 bg-background border-b">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open menu</p>
            </TooltipContent>
          </Tooltip>
          
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeView === 'settings' ? 'default' : 'ghost'}
                size={activeView === 'settings' ? 'sm' : 'icon'}
                onClick={onSettingsClick}
                className={activeView === 'settings' ? 'gap-2' : ''}
              >
                {activeView === 'settings' ? (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Back to Chat</span>
                  </>
                ) : (
                  <Settings className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to {activeView === 'settings' ? 'chat' : 'settings'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default MobileHeader;
