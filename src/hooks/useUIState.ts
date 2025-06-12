
import { useState } from 'react';

export const useUIState = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<'chat' | 'settings'>('chat');

  const setActiveTab = (tab: string) => {
    if (tab === 'chat' || tab === 'settings') {
      setActiveTabState(tab);
    }
  };

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab
  };
};
