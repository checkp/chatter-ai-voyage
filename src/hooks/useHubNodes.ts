import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callHubTool, CLOUD_MESH_ID, HubNode, HubModelEntry } from '@/lib/hub/client';

/**
 * Live list of connected mesh nodes (hub_nodes + realtime), plus the synthetic
 * "RoboHeard Cloud" node built from the caller's enabled cloud platforms.
 */
export const useHubNodes = (includeCloud = true) => {
  const [nodes, setNodes] = useState<HubNode[]>([]);
  const [cloudNode, setCloudNode] = useState<HubNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('hub_nodes')
      .select('mesh_id, name, host, version, agents, repo_focus, models, last_seen')
      .order('last_seen', { ascending: false });
    setNodes(
      ((data ?? []) as any[]).map((n) => ({
        ...n,
        agents: Array.isArray(n.agents) ? n.agents : [],
        repo_focus: Array.isArray(n.repo_focus) ? n.repo_focus : [],
        models: Array.isArray(n.models) ? n.models : [],
      })) as HubNode[],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('hub-nodes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_nodes' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Refresh presence dots every 10s.
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // Synthetic cloud node from hub_presence (reuses server-side list_models).
  useEffect(() => {
    if (!includeCloud) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await callHubTool<{ nodes: any[] }>('hub_presence', {});
        const cloud = (res?.nodes ?? []).find((n) => n.mesh_id === CLOUD_MESH_ID);
        if (!cancelled && cloud) {
          setCloudNode({
            mesh_id: CLOUD_MESH_ID,
            name: cloud.name ?? 'RoboHeard Cloud',
            host: cloud.host ?? CLOUD_MESH_ID,
            version: null,
            agents: [],
            repo_focus: [],
            models: (cloud.models ?? []) as HubModelEntry[],
            last_seen: new Date().toISOString(),
          });
        }
      } catch {
        /* cloud models unavailable — mesh nodes still work */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includeCloud]);

  return { nodes, cloudNode, loading, tick, reload: load };
};
