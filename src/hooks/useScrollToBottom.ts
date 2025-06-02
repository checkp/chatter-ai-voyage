
import { useRef, useCallback } from 'react';

export const useScrollToBottom = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    // Try scrolling the ScrollArea viewport first
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
      return;
    }
    
    // Fallback to the ref element
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const scrollToBottomImmediate = useCallback(() => {
    // Try scrolling the ScrollArea viewport first
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
      return;
    }
    
    // Fallback to the ref element
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  return { messagesEndRef, scrollAreaRef, scrollToBottom, scrollToBottomImmediate };
};
