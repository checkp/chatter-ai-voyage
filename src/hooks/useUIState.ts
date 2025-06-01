
import { useState } from 'react';

export const useUIState = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');

  const handleNewChat = async (createChatMutation: any) => {
    try {
      await createChatMutation.mutate(newChatTitle || 'New Chat');
      setNewChatTitle('');
      setIsNewChatDrawerOpen(false);
    } catch (error: any) {
      console.error('Failed to create chat:', error);
    }
  };

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    isNewChatDrawerOpen,
    setIsNewChatDrawerOpen,
    newChatTitle,
    setNewChatTitle,
    activeTab,
    setActiveTab,
    handleNewChat
  };
};
