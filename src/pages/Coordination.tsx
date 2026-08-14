import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Network, Send, Plus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PageSeo from '@/components/PageSeo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHubNodes } from '@/hooks/useHubNodes';
import {
  HubMessage,
  MCP_URL,
  displayName,
  isOnline,
  relativeTime,
} from '@/lib/hub/client';

const CONFIG_SNIPPET = `{"roboheard": {"url": "${MCP_URL}", "token": "rh_..."}}`;

const Coordination: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { nodes, loading, tick } = useHubNodes(false);

  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [channel, setChannel] = useState('general');
  const [newChannel, setNewChannel] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // Message history + realtime inserts.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from('hub_messages')
        .select('id, mesh_id, channel, body, by, created_at')
        .order('id', { ascending: false })
        .limit(200);
      if (!cancelled) setMessages(((data ?? []) as HubMessage[]).slice().reverse());
    };
    load();

    const ch = supabase
      .channel('hub-messages-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hub_messages' },
        (payload) => {
          const row = payload.new as HubMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const channels = useMemo(() => {
    const set = new Set<string>(['general']);
    messages.forEach((m) => set.add(m.channel));
    set.add(channel);
    return Array.from(set).sort();
  }, [messages, channel]);

  const visible = useMemo(
    () => messages.filter((m) => m.channel === channel),
    [messages, channel],
  );

  const nodeName = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((n) => map.set(n.mesh_id, n.name));
    return map;
  }, [nodes]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [visible.length, channel]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const { error } = await supabase.from('hub_messages').insert({
      user_id: user!.id,
      channel,
      body: text,
      by: displayName(user),
      mesh_id: null,
    });
    setSending(false);
    if (error) {
      toast.error('Could not send message');
      return;
    }
    setBody('');
  };

  const onlineCount = useMemo(
    () => nodes.filter((n) => isOnline(n.last_seen)).length,
    [nodes, tick],
  );

  return (
    <div className="min-h-screen bg-background">
      <PageSeo
        title="Mesh Coordination — RoboHeard Agent Fleets"
        description="See every ConductorAI node connected to your RoboHeard mesh, their agents and repo focus, and coordinate over shared channels in real time."
        path="/coordination"
      />

      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Coordination</h1>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            {onlineCount} online / {nodes.length} nodes
          </Badge>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/mesh-models">Mesh Models</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Nodes */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Connected nodes</h2>

          {loading && <p className="text-sm text-muted-foreground">Loading mesh…</p>}

          {!loading && nodes.length === 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">No meshes connected yet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Create a key on the{' '}
                  <Link to="/api" className="text-primary underline">
                    API page
                  </Link>
                  , then drop this into <code className="text-foreground">~/.conductorai/config.json</code>:
                </p>
                <pre className="rounded-md bg-muted/60 p-3 text-xs overflow-x-auto text-foreground">
                  {CONFIG_SNIPPET}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(CONFIG_SNIPPET);
                    toast.success('Config copied');
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy config
                </Button>
                <p>
                  Then restart <code className="text-foreground">conductorai share</code>.
                </p>
              </CardContent>
            </Card>
          )}

          {nodes.map((node) => {
            const online = isOnline(node.last_seen);
            return (
              <Card key={node.mesh_id} className={online ? '' : 'opacity-60'}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        online ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
                      }`}
                      aria-label={online ? 'online' : 'offline'}
                    />
                    <CardTitle className="text-base truncate">{node.name}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {node.host}
                    {node.version ? ` · v${node.version}` : ''} · {relativeTime(node.last_seen)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {node.agents.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Agents</p>
                      {node.agents.map((a, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <span className="font-medium truncate">{String(a.name ?? 'agent')}</span>
                          <span className="text-xs text-muted-foreground text-right truncate">
                            {String(a.activity ?? 'idle')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {node.repo_focus.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Repo focus
                      </p>
                      {node.repo_focus.map((r, i) => (
                        <div key={i} className="text-xs text-muted-foreground truncate">
                          <span className="text-foreground">{String(r.repo ?? '—')}</span>
                          {r.focus ? ` — ${String(r.focus)}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  {node.models.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {node.models.length} local model{node.models.length === 1 ? '' : 's'}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Channels */}
        <section className="flex flex-col rounded-lg border border-border min-h-[70vh]">
          <div className="flex items-center gap-2 border-b border-border p-3 overflow-x-auto">
            {channels.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === channel ? 'default' : 'ghost'}
                className="h-7 text-xs shrink-0"
                onClick={() => setChannel(c)}
              >
                #{c}
              </Button>
            ))}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <Input
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="new-channel"
                className="h-7 w-32 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newChannel.trim()) {
                    setChannel(newChannel.trim().replace(/\s+/g, '-').toLowerCase());
                    setNewChannel('');
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                aria-label="Create channel"
                onClick={() => {
                  if (!newChannel.trim()) return;
                  setChannel(newChannel.trim().replace(/\s+/g, '-').toLowerCase());
                  setNewChannel('');
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div ref={streamRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No messages in #{channel} yet. Say something — every connected node sees it on its
                next sync.
              </p>
            )}
            {visible.map((m) => {
              const fromAgent = !!m.mesh_id;
              return (
                <div
                  key={m.id}
                  className={`rounded-lg border p-3 ${
                    fromAgent ? 'border-border bg-muted/30' : 'border-primary/40 bg-primary/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium">{m.by}</span>
                    {fromAgent ? (
                      <Badge variant="outline" className="text-[10px] py-0">
                        {nodeName.get(m.mesh_id!) ?? m.mesh_id}
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] py-0">you</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {relativeTime(m.created_at)}
                    </span>
                  </div>
                  {/* Plain text only — bodies are untrusted remote-agent input. */}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border p-3 flex items-center gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Message #${channel}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button size="sm" onClick={send} disabled={sending || !body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Coordination;
