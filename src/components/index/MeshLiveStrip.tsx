import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Network, Boxes, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHubNodes } from '@/hooks/useHubNodes';
import { HubMessage, isOnline, relativeTime } from '@/lib/hub/client';

/** Compact live mesh strip — only rendered for signed-in users. */
const MeshLiveStrip: React.FC = () => {
  const { user } = useAuth();
  const { nodes, cloudNode, tick } = useHubNodes(true);
  const [latest, setLatest] = useState<HubMessage | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('hub_messages')
        .select('id, mesh_id, channel, body, by, created_at')
        .order('id', { ascending: false })
        .limit(1);
      if (!cancelled) setLatest(((data ?? [])[0] as HubMessage) ?? null);
    };
    load();
    const ch = supabase
      .channel('hub-strip-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hub_messages' }, (p) =>
        setLatest(p.new as HubMessage),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const onlineNodes = useMemo(() => nodes.filter((n) => isOnline(n.last_seen)), [nodes, tick]);
  const modelCount = useMemo(
    () =>
      onlineNodes.reduce((sum, n) => sum + n.models.length, 0) + (cloudNode?.models.length ?? 0),
    [onlineNodes, cloudNode],
  );

  if (!user) return null;

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              onlineNodes.length ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
            }`}
          />
          {onlineNodes.length} node{onlineNodes.length === 1 ? '' : 's'} online
        </span>
        <span className="text-muted-foreground">·</span>
        <span>{modelCount} models reachable</span>
        {latest && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground truncate max-w-[18rem]">
              {latest.by}: {latest.body} ({relativeTime(latest.created_at)})
            </span>
          </>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Link
            to="/coordination"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Network className="h-3.5 w-3.5" /> Coordination
          </Link>
          <Link to="/mesh-models" className="flex items-center gap-1 text-primary hover:underline">
            <Boxes className="h-3.5 w-3.5" /> Mesh Models <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MeshLiveStrip;
