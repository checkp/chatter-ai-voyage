
import { useRef, useEffect } from 'react';

export const useScrollToBottom = (dependencies: any[] = []) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, dependencies);

  return { messagesEndRef, scrollToBottom };
};
