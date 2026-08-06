import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Tablet, Unplug, Download, ScanText,
  MessageSquarePlus, Folder, FileText, Search, ExternalLink,
} from 'lucide-react';

type Note = {
  doc_id: string;
  name: string;
  parent_id: string | null;
  doc_type: string;
  modified_at: string | null;
  pdf_path: string | null;
  extracted_text: string | null;
};

type Status = { connected: boolean; connected_at: string | null; last_sync_at: string | null };

const call = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('remarkable', { body: payload });
  if (error) {
    let details = error.message;
    try { details = await (error as any).context?.text?.() ?? details; } catch { /* noop */ }
    throw new Error(details);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const RemarkableCard = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [openNote, setOpenNote] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from('remarkable_notes')
      .select('doc_id, name, parent_id, doc_type, modified_at, pdf_path, extracted_text')
      .order('modified_at', { ascending: false });
    setNotes((data as Note[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setStatus(await call({ action: 'status' }));
        await loadNotes();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load reMarkable status');
      }
    })();
  }, [loadNotes]);

  const folders = useMemo(() => {
    const map = new Map<string, string>();
    notes.filter(n => n.doc_type === 'CollectionType').forEach(n => map.set(n.doc_id, n.name));
    return map;
  }, [notes]);

  const documents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => n.doc_type !== 'CollectionType')
      .filter(n => !q || n.name.toLowerCase().includes(q))
      .map(n => ({ ...n, folder: n.parent_id ? folders.get(n.parent_id) ?? null : null }));
  }, [notes, query, folders]);

  const pair = async () => {
    setBusy('pair');
    try {
      await call({ action: 'pair', code: code.trim() });
      setCode('');
      setStatus(await call({ action: 'status' }));
      toast.success('Tablet connected');
      await sync();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Pairing failed');
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      const res = await call({ action: 'sync' });
      await loadNotes();
      setStatus(await call({ action: 'status' }));
      toast.success(`Synced ${res.count} items`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    try {
      await call({ action: 'disconnect' });
      setNotes([]);
      setStatus({ connected: false, connected_at: null, last_sync_at: null });
      toast.success('Tablet disconnected');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setBusy(null);
    }
  };

  const fetchPdf = async (docId: string) => {
    setBusy(`pdf:${docId}`);
    try {
      const res = await call({ action: 'fetch_pdf', doc_id: docId });
      await loadNotes();
      if (res.url) window.open(res.url, '_blank', 'noopener');
      toast.success('PDF fetched');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not fetch PDF');
    } finally {
      setBusy(null);
    }
  };

  const openPdf = async (docId: string) => {
    setBusy(`open:${docId}`);
    try {
      const res = await call({ action: 'signed_url', doc_id: docId });
      if (res.url) window.open(res.url, '_blank', 'noopener');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open PDF');
    } finally {
      setBusy(null);
    }
  };

  const transcribe = async (docId: string) => {
    setBusy(`ocr:${docId}`);
    try {
      await call({ action: 'extract_text', doc_id: docId });
      await loadNotes();
      setOpenNote(docId);
      toast.success('Handwriting transcribed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transcription failed');
    } finally {
      setBusy(null);
    }
  };

  const sendToChat = (note: Note) => {
    const text = `--- reMarkable note: ${note.name} ---\n${note.extracted_text}\n--- end note ---\n\n`;
    window.dispatchEvent(new CustomEvent('roboheard:insert-text', { detail: text }));
    toast.success('Added to the chat box', { duration: 2000 });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 modern-bg-surface modern-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Tablet className="h-5 w-5 mt-0.5 modern-text-primary" />
            <div>
              <h3 className="text-base font-semibold modern-text-primary">reMarkable tablet</h3>
              <p className="text-sm modern-text-secondary max-w-xl">
                Pair your tablet once, then pull notebooks in as PDFs, transcribe the handwriting
                with AI, and drop any note into a chat as context.
              </p>
            </div>
          </div>
          {status?.connected ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Connected</Badge>
              <Button size="sm" variant="outline" onClick={sync} disabled={!!busy}>
                {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-1.5">Sync</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={disconnect} disabled={!!busy}>
                <Unplug className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>

        {!status?.connected && (
          <div className="mt-5 space-y-3">
            <div className="text-sm modern-text-secondary">
              1. Open{' '}
              <a
                className="underline inline-flex items-center gap-1"
                href="https://my.remarkable.com/device/desktop/connect"
                target="_blank"
                rel="noopener noreferrer"
              >
                my.remarkable.com/device/desktop/connect <ExternalLink className="h-3 w-3" />
              </a>{' '}
              and copy the 8-character one-time code. 2. Paste it below — codes expire in about 5 minutes.
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1">
                <Label htmlFor="rm-code" className="text-xs modern-text-secondary">One-time code</Label>
                <Input
                  id="rm-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s/g, '').slice(0, 8))}
                  placeholder="abcdefgh"
                  className="w-40 font-mono tracking-widest"
                  autoComplete="off"
                />
              </div>
              <Button onClick={pair} disabled={code.trim().length !== 8 || !!busy}>
                {busy === 'pair' && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Connect tablet
              </Button>
            </div>
          </div>
        )}

        {status?.last_sync_at && (
          <p className="mt-4 text-xs modern-text-secondary">
            Last sync: {new Date(status.last_sync_at).toLocaleString()}
          </p>
        )}
      </Card>

      {status?.connected && (
        <Card className="p-5 modern-bg-surface modern-border">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h4 className="text-sm font-semibold modern-text-primary">
              Notebooks {documents.length > 0 && <span className="modern-text-secondary">({documents.length})</span>}
            </h4>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 modern-text-secondary" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notebooks"
                className="h-9 pl-8 w-56"
              />
            </div>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm modern-text-secondary">
              Nothing here yet — hit Sync to pull the notebook list off your tablet.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {documents.map((n) => (
                <li key={n.doc_id} className="rounded-md border modern-border px-3 py-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button
                      className="flex items-center gap-2 text-left min-w-0"
                      onClick={() => setOpenNote(openNote === n.doc_id ? null : n.doc_id)}
                    >
                      <FileText className="h-4 w-4 shrink-0 modern-text-secondary" />
                      <span className="truncate text-sm modern-text-primary">{n.name}</span>
                      {n.folder && (
                        <span className="flex items-center gap-1 text-xs modern-text-secondary shrink-0">
                          <Folder className="h-3 w-3" />{n.folder}
                        </span>
                      )}
                      {n.extracted_text && <Badge variant="secondary" className="text-[10px]">text</Badge>}
                    </button>
                    <div className="flex items-center gap-1">
                      {n.pdf_path ? (
                        <Button size="sm" variant="ghost" onClick={() => openPdf(n.doc_id)} disabled={!!busy}>
                          {busy === `open:${n.doc_id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                          <span className="ml-1 text-xs">PDF</span>
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => fetchPdf(n.doc_id)} disabled={!!busy}>
                          {busy === `pdf:${n.doc_id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          <span className="ml-1 text-xs">Fetch PDF</span>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => transcribe(n.doc_id)} disabled={!!busy}>
                        {busy === `ocr:${n.doc_id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanText className="h-3.5 w-3.5" />}
                        <span className="ml-1 text-xs">{n.extracted_text ? 'Re-read' : 'Read'}</span>
                      </Button>
                      {n.extracted_text && (
                        <Button size="sm" variant="ghost" onClick={() => sendToChat(n)} disabled={!!busy}>
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                          <span className="ml-1 text-xs">To chat</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {openNote === n.doc_id && n.extracted_text && (
                    <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs modern-text-secondary bg-muted/40 rounded p-3">
                      {n.extracted_text}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default RemarkableCard;
