
import { useRef, useCallback } from 'react';

export const useScrollToBottom = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    // Try multiple approaches to ensure scrolling works
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      // Force scroll to bottom immediately
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
    
    // Also try the ref element as backup
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  const scrollToBottomImmediate = useCallback(() => {
    // Force immediate scroll without animation
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
    
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, []);

  return { messagesEndRef, scrollAreaRef, scrollToBottom, scrollToBottomImmediate };
};
