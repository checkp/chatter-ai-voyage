
import React from 'react';
import DraggableAIStatusBar from '@/components/DraggableAIStatusBar';
import type { AIPlatform } from '@/types/chat';

interface StatusBarManagerProps {
  activeTab: string;
  activeChatId: string | null;
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  updateAgentOrder: (reorderedPlatforms: AIPlatform[]) => Promise<void>;
}

const StatusBarManager: React.FC<StatusBarManagerProps> = ({
  activeTab,
  activeChatId,
  platforms,
  activeAIStatuses,
  updateAgentOrder
}) => {
  if (activeTab === 'chat' && activeChatId) {
    return (
      <DraggableAIStatusBar
        platforms={platforms}
        activeAIStatuses={activeAIStatuses}
        onReorder={updateAgentOrder}
      />
    );
  }

  return null;
};

export default StatusBarManager;
