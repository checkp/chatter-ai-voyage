import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Boxes, Send, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PageSeo from '@/components/PageSeo';
import MarkdownMessage from '@/components/chat/MarkdownMessage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHubNodes } from '@/hooks/useHubNodes';
import {
  CLOUD_MESH_ID,
  HubJob,
  callHubTool,
  displayName,
  isOnline,
} from '@/lib/hub/client';

interface Selectable {
  key: string;
  meshId: string;
  nodeName: string;
  host: string;
  model: string;
  via?: string;
  online: boolean;
  isCloud: boolean;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

interface RunEntry {
  key: string;
  label: string;
  model: string;
  host: string;
  isCloud: boolean;
  jobId: string | null;
  startedAt: number;
}

const MeshModels: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { nodes, cloudNode, loading, tick } = useHubNodes(true);

  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [jobs, setJobs] = useState<Record<string, HubJob>>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [now, setNow] = useState(Date.now());
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime job updates.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('hub-jobs-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hub_model_jobs' },
        (payload) => {
          const row = payload.new as HubJob;
          if (!row?.id) return;
          setJobs((prev) => ({ ...prev, [row.id]: row }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const groups = useMemo(() => {
    const all = cloudNode ? [cloudNode, ...nodes] : nodes;
    const byHost = new Map<string, { host: string; nodeName: string; online: boolean; items: Selectable[] }>();
    all.forEach((node) => {
      const isCloud = node.mesh_id === CLOUD_MESH_ID;
      const online = isCloud || isOnline(node.last_seen);
      node.models.forEach((m) => {
        const host = m.host || node.host;
        const gkey = `${node.mesh_id}::${host}`;
        if (!byHost.has(gkey)) {
          byHost.set(gkey, { host, nodeName: node.name, online, items: [] });
        }
        byHost.get(gkey)!.items.push({
          key: `${node.mesh_id}::${host}::${m.model}`,
          meshId: node.mesh_id,
          nodeName: node.name,
          host,
          model: m.model,
          via: m.via,
          online,
          isCloud,
        });
      });
    });
    return Array.from(byHost.values());
  }, [nodes, cloudNode, tick]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const selectedItems = useMemo(
    () => flat.filter((i) => selected.includes(i.key) && i.online),
    [flat, selected],
  );
  const singleChat = selectedItems.length === 1;

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const selectAllOnline = () => setSelected(flat.filter((i) => i.online).map((i) => i.key));

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [turns.length, runs.length]);

  // In single-model chat mode, fold completed replies into the conversation history
  // so the next send includes them. appendedJobsRef guards double-appends from realtime.
  const appendedJobsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!singleChat) return;
    const finished = runs.filter((r) => {
      if (!r.jobId || appendedJobsRef.current.has(r.jobId)) return false;
      return jobs[r.jobId]?.status === 'done' && !!jobs[r.jobId]?.reply;
    });
    if (finished.length === 0) return;
    finished.forEach((r) => appendedJobsRef.current.add(r.jobId!));
    setTurns((prev) => [
      ...prev,
      ...finished.map((r) => ({ role: 'assistant' as const, content: jobs[r.jobId!].reply ?? '' })),
    ]);
    const doneKeys = new Set(finished.map((r) => r.key));
    setRuns((prev) => prev.filter((r) => !doneKeys.has(r.key)));
  }, [jobs, runs, singleChat]);


  const send = async () => {
    const text = prompt.trim();
    if (!text || sending) return;
    if (selectedItems.length === 0) {
      toast.error('Select at least one online model');
      return;
    }
    setSending(true);

    const history: Turn[] = singleChat ? [...turns, { role: 'user', content: text }] : [{ role: 'user', content: text }];
    if (singleChat) setTurns(history);

    const created: RunEntry[] = [];
    for (const item of selectedItems) {
      const entry: RunEntry = {
        key: `${item.key}-${Date.now()}`,
        label: `${item.nodeName} · ${item.host}`,
        model: item.model,
        host: item.host,
        isCloud: item.isCloud,
        jobId: null,
        startedAt: Date.now(),
      };
      try {
        const res = await callHubTool<{ job_id: string }>('hub_ask', {
          mesh_id: item.meshId,
          host: item.host,
          model: item.model,
          messages: history.map((t) => ({ role: t.role, content: t.content })),
          created_by: displayName(user),
        });
        entry.jobId = res?.job_id ?? null;
        if (entry.jobId) {
          const { data } = await supabase
            .from('hub_model_jobs')
            .select('id, target_mesh_id, target_host, model, status, reply, error, created_at, updated_at')
            .eq('id', entry.jobId)
            .maybeSingle();
          if (data) setJobs((prev) => ({ ...prev, [data.id]: data as HubJob }));
        }
      } catch (e: any) {
        toast.error(`${item.model}: ${e?.message ?? 'failed'}`);
      }
      created.push(entry);
    }

    setRuns(singleChat ? [...runs, ...created] : created);
    setPrompt('');
    setSending(false);
  };

  const jobFor = (r: RunEntry) => (r.jobId ? jobs[r.jobId] : undefined);
  const elapsed = (r: RunEntry) => {
    const job = jobFor(r);
    if (job && (job.status === 'done' || job.status === 'error')) {
      return Math.max(
        0,
        Math.round((new Date(job.updated_at).getTime() - new Date(job.created_at).getTime()) / 1000),
      );
    }
    return Math.round((now - r.startedAt) / 1000);
  };

  const statusBadge = (r: RunEntry) => {
    const job = jobFor(r);
    const status = job?.status ?? 'queued';
    const variant =
      status === 'done' ? 'secondary' : status === 'error' ? 'destructive' : 'outline';
    return (
      <Badge variant={variant as any} className="text-[10px] py-0">
        {status} · {elapsed(r)}s
      </Badge>
    );
  };

  const renderReply = (r: RunEntry) => {
    const job = jobFor(r);
    if (!job || job.status === 'queued' || job.status === 'running') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {job?.status === 'running' ? 'Generating…' : 'Queued…'}
        </div>
      );
    }
    if (job.status === 'error') {
      return <p className="text-sm text-destructive whitespace-pre-wrap break-words">{job.error}</p>;
    }
    // Markdown only for cloud replies; remote node output is untrusted plain text.
    return r.isCloud ? (
      <MarkdownMessage content={job.reply ?? ''} className="text-sm" />
    ) : (
      <p className="text-sm whitespace-pre-wrap break-words">{job.reply}</p>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSeo
        title="Mesh Models — Run Local & Cloud Models Together"
        description="Broadcast one prompt to every Ollama model on your mesh nodes plus RoboHeard's cloud platforms, and compare the answers side by side."
        path="/mesh-models"
      />

      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Mesh Models</h1>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            {selectedItems.length} selected
          </Badge>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/coordination">Coordination</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Model picker */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Reachable models</h2>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAllOnline}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Select all online
            </Button>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading mesh…</p>}
          {!loading && groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No models reachable.{' '}
              <Link to="/coordination" className="text-primary underline">
                Connect a mesh node
              </Link>{' '}
              to expose its local Ollama models.
            </p>
          )}

          {groups.map((g) => (
            <Card key={`${g.nodeName}-${g.host}`} className={g.online ? '' : 'opacity-50'}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${g.online ? 'bg-primary' : 'bg-muted-foreground'}`}
                  />
                  <CardTitle className="text-sm truncate">{g.host}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {g.nodeName} · {g.online ? 'online' : 'offline'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.items.map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2 text-sm ${
                      g.online ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <Checkbox
                      checked={selected.includes(item.key)}
                      disabled={!g.online}
                      onCheckedChange={() => toggle(item.key)}
                    />
                    <span className="truncate">{item.model}</span>
                    {item.via && (
                      <Badge variant="outline" className="text-[10px] py-0 ml-auto shrink-0">
                        {item.via}
                      </Badge>
                    )}
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Answers */}
        <section className="flex flex-col min-h-[70vh]">
          <div ref={streamRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
            {runs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Pick models and send one prompt — answers stream in side by side. Select exactly one
                model for a back-and-forth chat instead.
              </p>
            )}

            {singleChat || turns.length > 0 ? (
              <div className="space-y-3 max-w-3xl">
                {turns.map((t, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${
                      t.role === 'user'
                        ? 'border-primary/40 bg-primary/5 ml-auto max-w-[85%]'
                        : 'border-border bg-muted/30 mr-auto max-w-[85%]'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{t.content}</p>
                  </div>
                ))}
                {runs.map((r) => (
                  <div key={r.key} className="rounded-lg border border-border bg-muted/30 p-3 mr-auto max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium truncate">{r.model}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{r.label}</span>
                      <span className="ml-auto">{statusBadge(r)}</span>
                    </div>
                    {renderReply(r)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {runs.map((r) => (
                  <Card key={r.key}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm truncate">{r.model}</CardTitle>
                        <span className="ml-auto">{statusBadge(r)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{r.label}</p>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">{renderReply(r)}</CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sticky composer */}
          <div className="sticky bottom-0 bg-background border-t border-border pt-3 flex items-end gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                singleChat
                  ? `Chat with ${selectedItems[0]?.model}…`
                  : `Broadcast one prompt to ${selectedItems.length || 'selected'} models…`
              }
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={sending || !prompt.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MeshModels;
