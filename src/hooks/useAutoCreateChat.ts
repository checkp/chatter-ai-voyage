
import { useEffect } from 'react';
import type { Chat } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { UseMutationResult } from '@tanstack/react-query';

export const useAutoCreateChat = (
  user: SupabaseUser | null,
  isInitialLoadComplete: boolean,
  chats: Chat[] | undefined,
  createChatMutation: UseMutationResult<Chat, Error, { title: string }>
) => {
  useEffect(() => {
    if (isInitialLoadComplete && user && (!chats || chats.length === 0)) {
      // Only create chat if not already creating one
      if (!createChatMutation.isPending) {
        console.log('Auto-creating first chat for user');
        createChatMutation.mutate({ title: 'New Conversation' });
      }
    }
  }, [isInitialLoadComplete, user, chats, createChatMutation]);
};
