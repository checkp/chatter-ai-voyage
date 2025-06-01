
import { useState } from 'react';

export const useUIState = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab
  };
};
