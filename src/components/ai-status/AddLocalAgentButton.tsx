
import React, { useState } from 'react';
import { Plus, Check, Monitor, Loader2, Trash2, Globe, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchLocalModels } from '@/services/aiApiService';
import {
  probeDirectProviders,
  probeEndpoint,
  addCustomEndpoint,
  removeCustomEndpoint,
  encodeDirectSelection,
  type DirectProvider,
} from '@/services/localProviderService';
import { prettifyModelName } from '@/lib/prettifyModelName';
import type { AIPlatform } from '@/types/chat';

interface AddLocalAgentButtonProps {
  localPlatform?: AIPlatform;
  onSelect: (model: string | null) => void;
}

interface MenuProvider {
  key: string;
  name: string;
  badge: 'direct' | 'via server';
  removable?: boolean;       // custom endpoints can be removed
  customId?: string;
  models: Array<{ id: string; name: string; value: string }>;
}

/**
 * "+" button at the end of the agents bar. Opens a popover listing local
 * providers and their models. Discovery is browser-first: the page probes
 * localhost servers directly (works on roboheard.ai too — a remote Supabase
 * can never reach the user's machine). The server-side proxy (local-chat)
 * is kept as a fallback for self-hosted deployments.
 */
const AddLocalAgentButton: React.FC<AddLocalAgentButtonProps> = ({ localPlatform, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<MenuProvider[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const configured = !!localPlatform?.selectedModel;
  const current = localPlatform?.selectedModel ?? '';

  const discover = async () => {
    setLoading(true);
    try {
      // Browser-direct probes + server-side proxy list, in parallel. Either
      // may legitimately come up empty (e.g. no CORS locally / cloud server).
      const [direct, server] = await Promise.all([
        probeDirectProviders().catch(() => [] as DirectProvider[]),
        fetchLocalModels().catch(() => []),
      ]);

      const menu: MenuProvider[] = direct.map((p) => ({
        key: `direct-${p.id}`,
        name: p.name,
        badge: 'direct',
        removable: p.id.startsWith('custom-'),
        customId: p.id,
        models: p.models.map((m) => ({ id: m.id, name: m.name, value: encodeDirectSelection(p.base, m.id) })),
      }));

      // Hide a server-side provider when a direct provider already exposes the
      // same model set (same server reached two ways on self-hosted setups).
      const directSignatures = new Set(menu.map((p) => p.models.map((m) => m.id).sort().join('|')));
      for (const p of server) {
        const signature = [...p.models].sort().join('|');
        if (directSignatures.has(signature)) continue;
        menu.push({
          key: `server-${p.id}`,
          name: p.name,
          badge: 'via server',
          models: p.models.map((id: string) => ({ id, name: prettifyModelName(id), value: `${p.id}::${id}` })),
        });
      }
      setProviders(menu);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setShowAdd(false);
      setAddError(null);
      discover();
    }
  };

  const handleAddEndpoint = async () => {
    if (!addUrl.trim()) return;
    setAddBusy(true);
    setAddError(null);
    try {
      await probeEndpoint(addUrl);          // validate before saving
      addCustomEndpoint(addUrl);
      setAddUrl('');
      setShowAdd(false);
      await discover();
    } catch (e: any) {
      setAddError(e?.message || 'Could not reach endpoint');
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveEndpoint = async (customId: string) => {
    removeCustomEndpoint(customId);
    await discover();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="h-8 w-8 rounded-full border border-dashed border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent/30 transition-colors shrink-0"
          title={configured ? 'Change local model' : 'Add local agent'}
        >
          <Plus className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Local models</span>
        </div>

        {loading && (
          <div className="flex items-center gap-2 px-3 py-6 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Scanning local providers…
          </div>
        )}

        {!loading && providers && providers.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No local providers reachable. Start LM Studio with CORS enabled
            (<code className="text-[11px]">lms server start --cors</code>) or Ollama
            (<code className="text-[11px]">OLLAMA_ORIGINS=*</code>), then reopen this menu.
          </div>
        )}

        {!loading && providers && providers.length > 0 && (
          <ScrollArea className="max-h-72">
            <div className="py-1">
              {providers.map((provider) => (
                <div key={provider.key}>
                  <div className="px-3 pt-2 pb-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {provider.name}
                    </span>
                    <span className="text-[10px] rounded px-1 py-px bg-accent/50 text-muted-foreground">{provider.badge}</span>
                    {provider.removable && provider.customId && (
                      <button
                        onClick={() => handleRemoveEndpoint(provider.customId!)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        title="Remove endpoint"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {provider.models.map((model) => (
                    <button
                      key={model.value}
                      onClick={() => { onSelect(model.value); setOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-accent/40 transition-colors"
                    >
                      <span className="truncate" title={model.id}>{model.name}</span>
                      {model.value === current && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {!loading && (
          <div className="border-t border-border/50">
            {showAdd ? (
              <div className="p-2 space-y-1.5">
                <input
                  autoFocus
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEndpoint()}
                  placeholder="http://localhost:8000  (OpenAI-compatible)"
                  className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                />
                {addError && <div className="text-[11px] text-destructive px-1">{addError}</div>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAdd(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
                  <button
                    onClick={handleAddEndpoint}
                    disabled={addBusy}
                    className="text-xs rounded bg-primary text-primary-foreground px-2 py-1 disabled:opacity-50"
                  >
                    {addBusy ? 'Probing…' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" /> Add custom endpoint…
              </button>
            )}

            {configured && (
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-accent/30 transition-colors border-t border-border/50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove local agent
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AddLocalAgentButton;
