
import { useRef, useCallback, useState } from 'react';

export const useScrollToBottom = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState<number | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const getScrollArea = useCallback(() => {
    return document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
  }, []);

  const checkIfUserScrolledUp = useCallback(() => {
    const scrollArea = getScrollArea();
    if (!scrollArea) return false;
    
    const threshold = 100; // pixels from bottom
    const isNearBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - threshold;
    return !isNearBottom;
  }, [getScrollArea]);

  const scrollToBottom = useCallback(() => {
    // Only scroll if user hasn't manually scrolled up
    if (isUserScrolledUp) return;
    
    const scrollArea = getScrollArea();
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
    
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [getScrollArea, isUserScrolledUp]);

  const scrollToBottomImmediate = useCallback(() => {
    const scrollArea = getScrollArea();
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
    
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
    
    setIsUserScrolledUp(false);
  }, [getScrollArea]);

  const saveScrollPosition = useCallback(() => {
    const scrollArea = getScrollArea();
    if (scrollArea) {
      setSavedScrollPosition(scrollArea.scrollTop);
    }
  }, [getScrollArea]);

  const restoreScrollPosition = useCallback(() => {
    if (savedScrollPosition !== null) {
      const scrollArea = getScrollArea();
      if (scrollArea) {
        setTimeout(() => {
          scrollArea.scrollTop = savedScrollPosition;
          setSavedScrollPosition(null);
        }, 100);
      }
    }
  }, [getScrollArea, savedScrollPosition]);

  const handleScroll = useCallback(() => {
    const userScrolledUp = checkIfUserScrolledUp();
    setIsUserScrolledUp(userScrolledUp);
  }, [checkIfUserScrolledUp]);

  // Set up scroll listener
  const setupScrollListener = useCallback(() => {
    const scrollArea = getScrollArea();
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, [getScrollArea, handleScroll]);

  return { 
    messagesEndRef, 
    scrollAreaRef, 
    scrollToBottom, 
    scrollToBottomImmediate,
    saveScrollPosition,
    restoreScrollPosition,
    setupScrollListener,
    isUserScrolledUp
  };
};
