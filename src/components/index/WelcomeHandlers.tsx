
import React, { useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { seedProfileDemo } from '@/utils/profileDemo';
import type { ChatMode } from '@/types/chat';

interface WelcomeHandlersProps {
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  chats: any[] | undefined;
  handleCreateChat: (chatMode?: ChatMode) => void;
  setActiveChatId?: (id: string) => void;
}

const WelcomeHandlers: React.FC<WelcomeHandlersProps> = ({
  completeOnboarding,
  skipOnboarding,
  chats,
  handleCreateChat,
  setActiveChatId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const seedThenFallback = async () => {
    setSeeding(true);
    const convId = await seedProfileDemo(user);
    // Refresh chat list so the new demo conversation appears
    await queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
    if (convId && setActiveChatId) {
      setActiveChatId(convId);
    } else if (!convId && (!chats || chats.length === 0)) {
      handleCreateChat();
    }
    setSeeding(false);
  };

  const handleWelcomeComplete = async () => {
    await completeOnboarding();
    await seedThenFallback();
  };

  const handleWelcomeSkip = async () => {
    await skipOnboarding();
    await seedThenFallback();
  };

  if (seeding) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">The AIs are profiling you…</p>
      </div>
    );
  }

  return (
    <WelcomeScreen
      onGetStarted={handleWelcomeComplete}
      onSkip={handleWelcomeSkip}
    />
  );
};

export default WelcomeHandlers;
