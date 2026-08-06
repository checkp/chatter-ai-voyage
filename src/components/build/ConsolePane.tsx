import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CornerDownLeft, Eraser, RefreshCw, Loader2 } from 'lucide-react';

export interface ConsoleLine {
  id: number;
  stream: 'stdout' | 'stderr' | 'system' | 'input' | 'value';
  text: string;
}

const STREAM_CLASS: Record<ConsoleLine['stream'], string> = {
  stdout: 'text-foreground',
  stderr: 'text-destructive',
  system: 'text-muted-foreground italic',
  input: 'text-primary',
  value: 'text-accent-foreground',
};

interface ConsolePaneProps {
  lines: ConsoleLine[];
  busy: boolean;
  onEval: (code: string) => void;
  onClear: () => void;
  onReset: () => void;
}

const ConsolePane: React.FC<ConsolePaneProps> = ({ lines, busy, onEval, onClear, onReset }) => {
  const [entry, setEntry] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = () => {
    const code = entry.trim();
    if (!code || busy) return;
    setHistory(h => [...h, code]);
    setCursor(null);
    setEntry('');
    onEval(code);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setEntry(history[next]);
    }
    if (e.key === 'ArrowDown' && cursor !== null) {
      e.preventDefault();
      const next = cursor + 1;
      if (next >= history.length) { setCursor(null); setEntry(''); }
      else { setCursor(next); setEntry(history[next]); }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Console
        </span>
        {busy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClear} title="Clear console">
            <Eraser className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onReset} title="Restart interpreter">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 font-mono text-[11px] leading-relaxed">
        {lines.length === 0 ? (
          <p className="text-muted-foreground">Output appears here. Type Python below to poke at the running program.</p>
        ) : (
          lines.map(line => (
            <pre key={line.id} className={`whitespace-pre-wrap break-words ${STREAM_CLASS[line.stream]}`}>
              {line.stream === 'input' ? `>>> ${line.text}` : line.text}
            </pre>
          ))
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-border/60 p-1.5">
        <span className="pl-1 font-mono text-[11px] text-muted-foreground">&gt;&gt;&gt;</span>
        <Input
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="df.head()"
          spellCheck={false}
          className="h-7 border-0 bg-transparent font-mono text-[11px] shadow-none focus-visible:ring-0"
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={submit} disabled={busy || !entry.trim()} title="Run in console">
          <CornerDownLeft className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default ConsolePane;
