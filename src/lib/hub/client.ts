// Mesh hub client — thin wrapper over the roboheard-mcp JSON-RPC endpoint plus
// direct (RLS-scoped) table reads for realtime surfaces.
//
// SECURITY: every string coming from hub_nodes / hub_messages / hub_model_jobs
// originates from remote agents. Never render it as HTML/markdown.
import { supabase } from '@/integrations/supabase/client';

export const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;

export interface HubAgent {
  name?: string;
  activity?: string;
  [k: string]: unknown;
}

export interface HubRepoFocus {
  repo?: string;
  focus?: string;
  [k: string]: unknown;
}

export interface HubModelEntry {
  host: string;
  model: string;
  via?: string;
}

export interface HubNode {
  mesh_id: string;
  name: string;
  host: string;
  version: string | null;
  agents: HubAgent[];
  repo_focus: HubRepoFocus[];
  models: HubModelEntry[];
  last_seen: string;
}

export interface HubMessage {
  id: number;
  mesh_id: string | null;
  channel: string;
  body: string;
  by: string;
  created_at: string;
}

export type HubJobStatus = 'queued' | 'running' | 'done' | 'error';

export interface HubJob {
  id: string;
  target_mesh_id: string;
  target_host: string;
  model: string;
  status: HubJobStatus;
  reply: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export const CLOUD_MESH_ID = 'roboheard';

let rpcId = 0;

/** Call an MCP tool with the current Supabase session JWT. */
export async function callHubTool<T = any>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++rpcId,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });

  const payload = await res.json().catch(() => null);
  if (!payload) throw new Error('Invalid hub response');
  if (payload.error) throw new Error(payload.error.message || 'Hub error');

  const result = payload.result;
  if (result?.isError) {
    throw new Error(result?.content?.[0]?.text || 'Hub tool error');
  }
  const text = result?.content?.[0]?.text;
  if (typeof text === 'string') {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
  return result as T;
}

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 30_000;
}

export function relativeTime(iso: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function displayName(user: { email?: string | null; user_metadata?: any } | null): string {
  if (!user) return 'you';
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'you';
}
