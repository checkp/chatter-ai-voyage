
import React, { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { useActivityLog, type ActivityEntry } from '@/contexts/ActivityLogContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

const typeConfig: Record<ActivityEntry['type'], { color: string; label: string }> = {
  user: { color: 'text-blue-400', label: 'USR' },
  ai: { color: 'text-green-400', label: 'AI' },
  conductor: { color: 'text-purple-400', label: 'CND' },
  system: { color: 'text-muted-foreground', label: 'SYS' },
  error: { color: 'text-red-400', label: 'ERR' },
  network: { color: 'text-yellow-400', label: 'NET' },
};

const formatTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

const FloatingActivityConsole: React.FC = () => {
  const { entries, clearEntries } = useActivityLog();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries.length, isExpanded]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-16 left-4 z-40 h-8 w-8 rounded-full bg-background/80 border border-border/50 backdrop-blur-md flex items-center justify-center hover:bg-accent/50 transition-colors"
        title="Show activity console"
      >
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    );
  }

  const latestEntry = entries[0];

  return (
    <div className="fixed bottom-16 left-4 z-40 w-64 rounded-lg border border-border/50 bg-background/85 backdrop-blur-md shadow-lg overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-accent/30 transition-colors select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-mono text-muted-foreground">Activity</span>
          {!isExpanded && latestEntry && (
            <span className={`text-[10px] font-mono truncate ${typeConfig[latestEntry.type].color}`}>
              {latestEntry.message}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => { e.stopPropagation(); clearEntries(); }}
              title="Clear log"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
            title="Hide console"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </Button>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded log entries */}
      {isExpanded && (
        <div ref={scrollRef} className="max-h-24 overflow-y-auto border-t border-border/30">
          {entries.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-muted-foreground font-mono">
              No activity yet...
            </div>
          ) : (
            <div className="px-2 py-1 space-y-0.5">
              {entries.map((entry) => {
                const cfg = typeConfig[entry.type];
                return (
                  <div key={entry.id} className="flex items-start gap-1.5 text-[10px] font-mono leading-tight py-0.5">
                    <span className="text-muted-foreground/60 shrink-0">{formatTime(entry.timestamp)}</span>
                    <span className={`shrink-0 font-semibold ${cfg.color}`}>[{cfg.label}]</span>
                    <span className="text-foreground/80 break-words min-w-0">
                      {entry.platform && <span className={`${cfg.color} font-medium`}>{entry.platform}: </span>}
                      {entry.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingActivityConsole;
