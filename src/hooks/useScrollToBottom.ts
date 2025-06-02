
import { useRef, useCallback } from 'react';

export const useScrollToBottom = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { messagesEndRef, scrollToBottom };
};
