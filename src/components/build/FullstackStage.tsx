import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Database, Eraser, Globe, Loader2, RefreshCw } from 'lucide-react';
import { parseBundle, projectParts, renderPage, resolvePage } from '@/lib/fullstack';
import { FullstackSession, type TableSnapshot } from '@/lib/fullstackSession';
import type { ApiRequest } from '@/lib/buildHarness';

interface Props {
  code: string;
  narrow: boolean;
  onLog?: (stream: 'stdout' | 'stderr' | 'system', text: string) => void;
}

interface Call { id: number; method: string; url: string; status: number; ms: number }

/** Live preview of a full-stack bundle: pages in an iframe, API + SQLite in Pyodide. */
const FullstackStage: React.FC<Props> = ({ code, narrow, onLog }) => {
  const files = useMemo(() => parseBundle(code), [code]);
  const { pages, schema } = useMemo(() => projectParts(files), [files]);
  const [page, setPage] = useState('frontend/index.html');
  const [view, setView] = useState<'app' | 'data'>('app');
  const [status, setStatus] = useState<'booting' | 'ready' | 'error'>('booting');
  const [bootError, setBootError] = useState<string | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [tables, setTables] = useState<Record<string, TableSnapshot>>({});
  const [frameKey, setFrameKey] = useState(0);
  const sessionRef = useRef<FullstackSession | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const logRef = useRef(onLog);
  logRef.current = onLog;

  useEffect(() => {
    if (!pages.includes(page)) setPage(pages.includes('frontend/index.html') ? 'frontend/index.html' : pages[0] ?? page);
  }, [pages, page]);

  // One backend per revision.
  useEffect(() => {
    const session = new FullstackSession((s, t) => logRef.current?.(s, t));
    sessionRef.current = session;
    setStatus('booting');
    setBootError(null);
    setCalls([]);
    session.boot(code).then(r => {
      if (sessionRef.current !== session) return;
      setStatus(r.ok ? 'ready' : 'error');
      setBootError(r.ok ? null : r.error ?? 'backend failed to start');
      if (!r.ok) logRef.current?.('stderr', r.error ?? 'backend failed to start');
    });
    return () => { session.terminate(); if (sessionRef.current === session) sessionRef.current = null; };
  }, [code]);

  const refreshData = useCallback(async () => {
    if (sessionRef.current) setTables(await sessionRef.current.snapshot());
  }, []);

  useEffect(() => { if (view === 'data' && status === 'ready') void refreshData(); }, [view, status, refreshData]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const data = event.data;
      if (data?.__rhApi && sessionRef.current) {
        const req = data.__rhApi as ApiRequest;
        const t0 = performance.now();
        const res = await sessionRef.current.request(req);
        frameRef.current?.contentWindow?.postMessage({ __rhApiReply: { id: req.id, ...res } }, '*');
        setCalls(prev => [...prev.slice(-30), {
          id: Date.now() + Math.random(), method: req.method, url: req.url,
          status: res.status, ms: Math.round(performance.now() - t0),
        }]);
      } else if (typeof data?.__rhNav === 'string') {
        const next = resolvePage(files, page, data.__rhNav);
        if (next) setPage(next);
        else logRef.current?.('system', `No page for link "${data.__rhNav}"`);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [files, page]);

  const srcDoc = useMemo(() => renderPage(files, page), [files, page]);
  const tableNames = Object.keys(tables);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5">
          <Button size="sm" variant={view === 'app' ? 'secondary' : 'ghost'} className="h-6 gap-1 px-2 text-xs" onClick={() => setView('app')}>
            <Globe className="h-3 w-3" /> App
          </Button>
          <Button size="sm" variant={view === 'data' ? 'secondary' : 'ghost'} className="h-6 gap-1 px-2 text-xs" onClick={() => setView('data')}>
            <Database className="h-3 w-3" /> Data
          </Button>
        </div>
        {view === 'app' && pages.length > 0 && (
          <Select value={page} onValueChange={setPage}>
            <SelectTrigger className="h-7 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pages.map(p => (
                <SelectItem key={p} value={p} className="text-xs">/{p.replace(/^frontend\//, '')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Badge variant={status === 'error' ? 'destructive' : 'secondary'} className="gap-1 text-[10px]">
          {status === 'booting' && <Loader2 className="h-3 w-3 animate-spin" />}
          {status === 'booting' ? 'starting backend…' : status === 'ready' ? 'backend live' : 'backend crashed'}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
            title="Empty the database back to the schema"
            disabled={status !== 'ready'}
            onClick={async () => { await sessionRef.current?.resetData(); setFrameKey(k => k + 1); void refreshData(); }}
          >
            <Eraser className="h-3.5 w-3.5" /> Reset data
          </Button>
          {view === 'data' && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={refreshData} title="Refresh tables">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {bootError && (
        <pre className="max-h-24 shrink-0 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/5 p-2 font-mono text-[10px]">
          {bootError}
        </pre>
      )}

      {view === 'app' ? (
        <>
          <div className={`min-h-0 flex-1 ${narrow ? 'mx-auto w-[390px] max-w-full' : 'w-full'}`}>
            {pages.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">No frontend pages in this project yet.</div>
            ) : (
              <iframe
                ref={frameRef}
                key={`${page}-${frameKey}-${status}`}
                title="App preview"
                srcDoc={status === 'booting' ? '' : srcDoc}
                sandbox="allow-scripts allow-forms allow-modals"
                className="h-full w-full rounded-md border border-border bg-background"
              />
            )}
          </div>
          {calls.length > 0 && (
            <div className="max-h-20 shrink-0 overflow-y-auto rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[10px] leading-relaxed">
              {calls.slice().reverse().map(c => (
                <div key={c.id} className="flex gap-2">
                  <span className={c.status >= 400 ? 'text-destructive' : 'text-primary'}>{c.status}</span>
                  <span className="w-12 shrink-0 text-muted-foreground">{c.method}</span>
                  <span className="truncate">{c.url}</span>
                  <span className="ml-auto text-muted-foreground">{c.ms} ms</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {tableNames.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {schema.trim() ? 'No tables yet — the backend may still be starting.' : 'This project has no database schema (db/schema.sql).'}
            </p>
          ) : tableNames.map(name => {
            const t = tables[name];
            return (
              <div key={name} className="rounded-md border border-border">
                <div className="border-b border-border px-2 py-1 text-xs font-semibold">
                  {name} <span className="font-normal text-muted-foreground">· {t.count} rows</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[10px]">
                    <thead>
                      <tr>{t.columns.map(c => <th key={c} className="px-2 py-1 text-left text-muted-foreground">{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r, i) => (
                        <tr key={i} className="border-t border-border/50">
                          {r.map((v, j) => <td key={j} className="max-w-[16rem] truncate px-2 py-1">{v == null ? '∅' : String(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FullstackStage;
