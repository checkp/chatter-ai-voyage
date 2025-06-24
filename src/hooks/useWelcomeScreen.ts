
import { useState, useEffect } from 'react';
import type { Chat } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export const useWelcomeScreen = (
  user: SupabaseUser | null,
  isInitialLoadComplete: boolean,
  chats: Chat[] | undefined
) => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (user && isInitialLoadComplete && (!chats || chats.length === 0)) {
      setShowWelcome(true);
    }
  }, [user, isInitialLoadComplete, chats]);

  return {
    showWelcome,
    setShowWelcome
  };
};
