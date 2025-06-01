
import { useState, useCallback } from 'react';
import type { Message, AIPlatform, Chat } from '@/types/chat';

export interface ChatState {
  isDiscussionActive: boolean;
  activeResponders: Set<string>;
  roundCount: number;
  maxRounds: number;
  messageCount: number;
  errors: Map<string, string>;
  platformStatuses: Map<string, 'idle' | 'thinking' | 'responding' | 'completed' | 'error'>;
}

export const useChatState = () => {
  const [state, setState] = useState<ChatState>({
    isDiscussionActive: false,
    activeResponders: new Set(),
    roundCount: 0,
    maxRounds: 5,
    messageCount: 0,
    errors: new Map(),
    platformStatuses: new Map()
  });

  const updateState = useCallback((updates: Partial<ChatState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setPlatformStatus = useCallback((platformId: string, status: ChatState['platformStatuses'] extends Map<string, infer T> ? T : never) => {
    setState(prev => {
      const newStatuses = new Map(prev.platformStatuses);
      newStatuses.set(platformId, status);
      return { ...prev, platformStatuses: newStatuses };
    });
  }, []);

  const addError = useCallback((platformId: string, error: string) => {
    setState(prev => {
      const newErrors = new Map(prev.errors);
      newErrors.set(platformId, error);
      return { ...prev, errors: newErrors };
    });
  }, []);

  const clearError = useCallback((platformId: string) => {
    setState(prev => {
      const newErrors = new Map(prev.errors);
      newErrors.delete(platformId);
      return { ...prev, errors: newErrors };
    });
  }, []);

  const resetState = useCallback(() => {
    setState({
      isDiscussionActive: false,
      activeResponders: new Set(),
      roundCount: 0,
      maxRounds: 5,
      messageCount: 0,
      errors: new Map(),
      platformStatuses: new Map()
    });
  }, []);

  return {
    state,
    updateState,
    setPlatformStatus,
    addError,
    clearError,
    resetState
  };
};
