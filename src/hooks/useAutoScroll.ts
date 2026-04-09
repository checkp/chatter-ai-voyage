import { useRef, useEffect } from 'react';

/**
 * Auto-scrolls a container to the bottom when messages change.
 * Returns a ref to place at the end of the messages list.
 */
export const useAutoScroll = (dependencies: any[]) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return endRef;
};
