
import React from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import type { ChatMode } from '@/types/chat';

interface WelcomeHandlersProps {
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  chats: any[] | undefined;
  handleCreateChat: (chatMode?: ChatMode) => void;
}

const WelcomeHandlers: React.FC<WelcomeHandlersProps> = ({
  completeOnboarding,
  skipOnboarding,
  chats,
  handleCreateChat
}) => {
  const handleWelcomeComplete = async () => {
    await completeOnboarding();
    // Create first chat if none exists
    if (!chats || chats.length === 0) {
      handleCreateChat();
    }
  };

  const handleWelcomeSkip = async () => {
    await skipOnboarding();
    // Create first chat if none exists
    if (!chats || chats.length === 0) {
      handleCreateChat();
    }
  };

  return (
    <WelcomeScreen 
      onGetStarted={handleWelcomeComplete}
      onSkip={handleWelcomeSkip}
    />
  );
};

export default WelcomeHandlers;
