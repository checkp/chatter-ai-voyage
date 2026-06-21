/**
 * Advanced AI capability registry — Think / Search / Deep Research / Code Execution.
 *
 * The toggle state lives in three places:
 *  1. Per-message overrides set from <ChatInput /> via setPendingCapabilities()
 *  2. Per-agent defaults loaded from `user_capability_defaults` (DB)
 *  3. Conductor-issued per-agent capabilities parsed from its [CAPABILITIES: ...] tag
 *
 * `resolveCapabilitiesForPlatform()` merges all three (in that priority order),
 * then drops any flag the model can't actually do via `isCapabilitySupported()`.
 */

export type CapabilityKey = 'think' | 'search' | 'deep_research' | 'code_exec';

export interface Capabilities {
  think?: boolean;
  search?: boolean;
  deep_research?: boolean;
  code_exec?: boolean;
}

export const ALL_CAPABILITY_KEYS: CapabilityKey[] = ['think', 'search', 'deep_research', 'code_exec'];

export const CAPABILITY_META: Record<CapabilityKey, { label: string; tooltip: string }> = {
  think:         { label: 'Think',         tooltip: 'Extended reasoning — slower, deeper answers.' },
  search:        { label: 'Search',        tooltip: 'Live web search with citations.' },
  deep_research: { label: 'Deep Research', tooltip: 'Multi-step research report. Expensive.' },
  code_exec:     { label: 'Code',          tooltip: 'Run code to compute answers and analyze data.' },
};

/** Which platforms can plausibly handle each capability (used for UI grey-out). */
export const PLATFORM_CAPABILITY_SUPPORT: Record<string, Record<CapabilityKey, boolean>> = {
  openai:     { think: true,  search: true,  deep_research: true,  code_exec: true  },
  anthropic:  { think: true,  search: true,  deep_research: true,  code_exec: true  },
  google:     { think: true,  search: true,  deep_research: true,  code_exec: true  },
  grok:       { think: true,  search: true,  deep_research: true,  code_exec: false },
  deepseek:   { think: true,  search: false, deep_research: true,  code_exec: false },
  perplexity: { think: true,  search: true,  deep_research: true,  code_exec: false },
  mistral:    { think: false, search: false, deep_research: false, code_exec: false },
  qwen:       { think: false, search: false, deep_research: false, code_exec: false },
};

export const isCapabilitySupported = (platform: string, cap: CapabilityKey): boolean =>
  !!PLATFORM_CAPABILITY_SUPPORT[platform]?.[cap];

const filterToSupported = (platform: string, caps: Capabilities): Capabilities => {
  const out: Capabilities = {};
  for (const key of ALL_CAPABILITY_KEYS) {
    if (caps[key] && isCapabilitySupported(platform, key)) out[key] = true;
  }
  return out;
};

// ─── Pending per-message overrides ──────────────────────────────────────────────
let pendingCapabilities: Capabilities = {};
let consumeOnNextCall = true;

export const setPendingCapabilities = (caps: Capabilities, options?: { sticky?: boolean }) => {
  pendingCapabilities = { ...caps };
  consumeOnNextCall = !options?.sticky;
};

export const getPendingCapabilities = (): Capabilities => ({ ...pendingCapabilities });

export const clearPendingCapabilities = () => {
  pendingCapabilities = {};
};

// ─── Per-agent DB defaults cache ────────────────────────────────────────────────
let agentDefaults: Record<string, Capabilities> = {};

export const setAgentCapabilityDefaults = (defaults: Record<string, Capabilities>) => {
  agentDefaults = { ...defaults };
};

export const getAgentCapabilityDefault = (platform: string): Capabilities =>
  ({ ...(agentDefaults[platform] ?? {}) });

// ─── Conductor per-agent overrides ──────────────────────────────────────────────
let conductorOverrides: Record<string, Capabilities> = {};

export const setConductorCapabilityOverrides = (map: Record<string, Capabilities>) => {
  conductorOverrides = { ...map };
};

export const clearConductorCapabilityOverrides = () => {
  conductorOverrides = {};
};

// ─── Merge resolution ───────────────────────────────────────────────────────────
/**
 * Resolve the active capability set for a given platform.
 * Priority: conductor override > per-message pending > per-agent default.
 * Result is filtered to capabilities the platform actually supports.
 *
 * Called once per agent API call. If pending was set as one-shot (default),
 * the pending bag is cleared automatically when this is called from the
 * "primary" send path. The conductor flow uses its own setter and clearer.
 */
export const resolveCapabilitiesForPlatform = (platform: string): Capabilities => {
  const merged: Capabilities = {
    ...getAgentCapabilityDefault(platform),
    ...pendingCapabilities,
    ...(conductorOverrides[platform] ?? {}),
  };
  return filterToSupported(platform, merged);
};

/** Call after the entire send fan-out completes, to drop one-shot pending caps. */
export const maybeConsumePending = () => {
  if (consumeOnNextCall) pendingCapabilities = {};
};

// ─── Conductor tag parsing ──────────────────────────────────────────────────────
/**
 * Parse `[CAPABILITIES: anthropic=think,search; openai=code_exec]` lines from
 * the conductor's reply. Returns a per-platform capability map (using platform
 * ids OR agent display names — the caller resolves agent names → platform ids).
 */
export const parseConductorCapabilities = (
  text: string,
  platformsByName: Record<string, string>,
): Record<string, Capabilities> => {
  const out: Record<string, Capabilities> = {};
  const re = /\[CAPABILITIES:\s*([^\]]+)\]/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const body = match[1];
    for (const chunk of body.split(';')) {
      const [rawAgent, rawList] = chunk.split('=');
      if (!rawAgent || !rawList) continue;
      const agentKey = rawAgent.trim().toLowerCase();
      const platformId = platformsByName[agentKey] ?? agentKey;
      const caps: Capabilities = {};
      for (const flag of rawList.split(',').map(s => s.trim().toLowerCase())) {
        if (flag === 'think' || flag === 'search' || flag === 'deep_research' || flag === 'code_exec') {
          caps[flag as CapabilityKey] = true;
        } else if (flag === 'research') {
          caps.deep_research = true;
        } else if (flag === 'code') {
          caps.code_exec = true;
        }
      }
      out[platformId] = { ...(out[platformId] ?? {}), ...caps };
    }
  }
  return out;
};
