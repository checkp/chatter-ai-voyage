import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  type Capabilities,
  type CapabilityKey,
  setAgentCapabilityDefaults,
} from '@/lib/capabilities';

const ROW_TO_CAPS = (row: { think: boolean; search: boolean; deep_research: boolean; code_exec: boolean }): Capabilities => ({
  think: row.think,
  search: row.search,
  deep_research: row.deep_research,
  code_exec: row.code_exec,
});

/**
 * Loads per-agent capability defaults from `user_capability_defaults`,
 * keeps them in sync with the shared capabilities registry, and exposes a
 * setter that writes back to the DB.
 */
export const useCapabilityDefaults = (user: SupabaseUser | null) => {
  const [defaults, setDefaults] = useState<Record<string, Capabilities>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setDefaults({});
      setAgentCapabilityDefaults({});
      setLoaded(false);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('user_capability_defaults')
        .select('platform, think, search, deep_research, code_exec')
        .eq('user_id', user.id);
      if (!active) return;
      if (error) {
        console.warn('Failed to load capability defaults:', error);
        setLoaded(true);
        return;
      }
      const map: Record<string, Capabilities> = {};
      (data ?? []).forEach(row => { map[row.platform] = ROW_TO_CAPS(row); });
      setDefaults(map);
      setAgentCapabilityDefaults(map);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [user]);

  const setCapability = useCallback(
    async (platform: string, key: CapabilityKey, value: boolean) => {
      if (!user) return;
      const next: Capabilities = { ...(defaults[platform] ?? {}), [key]: value };
      const merged = { ...defaults, [platform]: next };
      setDefaults(merged);
      setAgentCapabilityDefaults(merged);
      const { error } = await supabase
        .from('user_capability_defaults')
        .upsert(
          {
            user_id: user.id,
            platform,
            think: !!next.think,
            search: !!next.search,
            deep_research: !!next.deep_research,
            code_exec: !!next.code_exec,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' },
        );
      if (error) console.warn('Failed to save capability default:', error);
    },
    [user, defaults],
  );

  return { defaults, loaded, setCapability };
};
