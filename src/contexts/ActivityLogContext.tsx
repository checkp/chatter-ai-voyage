
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'conductor' | 'system' | 'error' | 'network';
  message: string;
  platform?: string;
}

interface ActivityLogContextType {
  entries: ActivityEntry[];
  addEntry: (type: ActivityEntry['type'], message: string, platform?: string) => void;
  clearEntries: () => void;
}

const ActivityLogContext = createContext<ActivityLogContextType>({
  entries: [],
  addEntry: () => {},
  clearEntries: () => {},
});

export const useActivityLog = () => useContext(ActivityLogContext);

export const ActivityLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const counterRef = useRef(0);

  const addEntry = useCallback((type: ActivityEntry['type'], message: string, platform?: string) => {
    counterRef.current += 1;
    const entry: ActivityEntry = {
      id: `${Date.now()}-${counterRef.current}`,
      timestamp: new Date(),
      type,
      message,
      platform,
    };
    setEntries(prev => {
      const next = [entry, ...prev];
      return next.length > 100 ? next.slice(0, 100) : next;
    });
  }, []);

  const clearEntries = useCallback(() => setEntries([]), []);

  return (
    <ActivityLogContext.Provider value={{ entries, addEntry, clearEntries }}>
      {children}
    </ActivityLogContext.Provider>
  );
};
