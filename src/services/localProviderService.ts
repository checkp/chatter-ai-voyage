// Browser-direct access to local model servers (LM Studio, Ollama, or any
// OpenAI-compatible endpoint). The browser talks to localhost itself — a remote
// Supabase (roboheard.ai) can never reach a user's machine, so discovery and
// chat both happen client-side here. Requires CORS on the local server
// (LM Studio: `lms server start --cors`; Ollama: OLLAMA_ORIGINS).
//
// Selected models are encoded as "direct::<base-url>::<model-id>" in the Local
// platform's selectedModel — distinct from the server-side proxy encoding
// ("lmstudio::<model>") used by the local-chat edge function on self-hosted
// deployments where the cluster can reach the host.
import { prettifyModelName } from '@/lib/prettifyModelName';

export interface DirectModel {
  id: string;
  name: string;
}

export interface DirectProvider {
  id: string;          // 'lmstudio' | 'ollama' | 'custom-<slug>'
  name: string;
  base: string;        // e.g. http://localhost:1234/v1
  models: DirectModel[];
  direct: true;
}

export interface CustomEndpoint {
  id: string;
  name: string;
  base: string;
}

const DIRECT_PREFIX = 'direct::';
const STORAGE_KEY = 'roboheard-local-endpoints';

// Well-known local servers; 127.0.0.1 variants help Safari, which is stricter
// about the "localhost" loopback exemption on https pages.
const WELL_KNOWN: Array<{ id: string; name: string; candidates: string[] }> = [
  { id: 'lmstudio', name: 'LM Studio', candidates: ['http://localhost:1234/v1', 'http://127.0.0.1:1234/v1'] },
  { id: 'ollama',   name: 'Ollama',    candidates: ['http://localhost:11434/v1', 'http://127.0.0.1:11434/v1'] },
];

const normalizeBase = (url: string): string => {
  let base = url.trim().replace(/\/+$/, '');
  if (!/\/v\d+$/.test(base)) base = `${base}/v1`;
  return base;
};

const probeBase = async (base: string, timeoutMs = 2000): Promise<DirectModel[] | null> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/models`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const payload = await res.json();
    const raw: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
    const models = raw
      .map((m) => String(m.id ?? m.name ?? m.model ?? '').trim())
      .filter((id) => id && !/embed/i.test(id))
      .map((id) => ({ id, name: prettifyModelName(id) }));
    return models.length ? models : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// ── custom endpoints (persisted in this browser only) ────────────────────────

export const getCustomEndpoints = (): CustomEndpoint[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
};

export const addCustomEndpoint = (url: string, name?: string): CustomEndpoint => {
  const base = normalizeBase(url);
  const host = new URL(base).host.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const endpoint: CustomEndpoint = {
    id: `custom-${host}`,
    name: name?.trim() || new URL(base).host,
    base,
  };
  const list = getCustomEndpoints().filter((e) => e.id !== endpoint.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, endpoint]));
  return endpoint;
};

export const removeCustomEndpoint = (id: string): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getCustomEndpoints().filter((e) => e.id !== id)));
};

// ── discovery ─────────────────────────────────────────────────────────────────

export const probeDirectProviders = async (): Promise<DirectProvider[]> => {
  const wellKnown = WELL_KNOWN.map(async ({ id, name, candidates }) => {
    for (const base of candidates) {
      const models = await probeBase(base);
      if (models) return { id, name, base, models, direct: true as const };
    }
    return null;
  });
  const custom = getCustomEndpoints().map(async ({ id, name, base }) => {
    const models = await probeBase(base);
    return models ? { id, name, base, models, direct: true as const } : null;
  });
  const results = await Promise.all([...wellKnown, ...custom]);
  return results.filter((p): p is DirectProvider => !!p);
};

// Probe an endpoint the user just typed, before saving it.
export const probeEndpoint = async (url: string): Promise<DirectModel[]> => {
  const models = await probeBase(normalizeBase(url), 5000);
  if (!models) throw new Error('Endpoint unreachable or exposed no chat models (is CORS enabled?)');
  return models;
};

// ── selection encoding + chat ─────────────────────────────────────────────────

export const encodeDirectSelection = (base: string, modelId: string): string =>
  `${DIRECT_PREFIX}${base}::${modelId}`;

export const parseDirectSelection = (selection: string): { base: string; modelId: string } | null => {
  if (!selection.startsWith(DIRECT_PREFIX)) return null;
  const rest = selection.slice(DIRECT_PREFIX.length);
  const sep = rest.lastIndexOf('::');
  if (sep <= 0) return null;
  return { base: rest.slice(0, sep), modelId: rest.slice(sep + 2) };
};

export const chatDirect = async (
  base: string,
  modelId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<string> => {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelId, messages, max_tokens: 4096 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Local model error: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Local model returned an empty response');
  return content;
};
