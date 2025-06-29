
import { useEffect, useMemo } from 'react';

export const useScrollEffects = (
  activeTab: string,
  messages: any[] | undefined,
  isLoadingMessages: boolean,
  activeChatId: string | null,
  lastScrollPosition: number | null,
  isUserScrolledUp: boolean,
  setupScrollListener: () => (() => void) | undefined,
  saveScrollPosition: () => void,
  restoreScrollPosition: () => void,
  scrollToBottom: () => void,
  scrollToBottomImmediate: () => void,
  previousMessageCountRef: React.MutableRefObject<number>,
  previousActiveTabRef: React.MutableRefObject<string>,
  user: any,
  reloadSettings: () => void
) => {
  // Set up scroll listener when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      const cleanup = setupScrollListener();
      return cleanup;
    }
  }, [activeTab, setupScrollListener]);

  useEffect(() => {
    if (previousActiveTabRef.current === 'chat' && activeTab !== 'chat') {
      saveScrollPosition();
    }
    
    if (previousActiveTabRef.current !== 'chat' && activeTab === 'chat' && lastScrollPosition !== null) {
      setTimeout(() => {
        restoreScrollPosition();
      }, 100);
    }
    
    previousActiveTabRef.current = activeTab;
  }, [activeTab, saveScrollPosition, restoreScrollPosition, lastScrollPosition]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const hasNewMessages = messages.length > previousMessageCountRef.current;
      
      if (hasNewMessages && activeTab === 'chat') {
        if (!isUserScrolledUp) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
      
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, scrollToBottom, isUserScrolledUp, activeTab]);

  useEffect(() => {
    if (messages && !isLoadingMessages && activeChatId && activeTab === 'chat') {
      if (lastScrollPosition === null || !isUserScrolledUp) {
        setTimeout(() => {
          scrollToBottomImmediate();
        }, 200);
      }
    }
  }, [activeChatId, isLoadingMessages, scrollToBottomImmediate, activeTab, lastScrollPosition, isUserScrolledUp]);

  useEffect(() => {
    if (activeTab === 'chat' && user) {
      reloadSettings();
    }
  }, [activeTab, user, reloadSettings]);
};
