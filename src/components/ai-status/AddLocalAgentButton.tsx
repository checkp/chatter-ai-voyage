
import React, { useState } from 'react';
import { Plus, Check, Monitor, Loader2, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchLocalModels, type LocalProvider } from '@/services/aiApiService';
import { prettifyModelName } from '@/lib/prettifyModelName';
import type { AIPlatform } from '@/types/chat';

interface AddLocalAgentButtonProps {
  localPlatform?: AIPlatform;
  onSelect: (model: string | null) => void;
}

/**
 * "+" button at the end of the agents bar. Opens a popover listing the local
 * providers (LM Studio / Ollama) and their available models; picking a model
 * enables the Local agent with it. Not a separate page by design.
 */
const AddLocalAgentButton: React.FC<AddLocalAgentButtonProps> = ({ localPlatform, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<LocalProvider[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = !!localPlatform?.selectedModel;
  const current = localPlatform?.selectedModel ?? '';

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next) {
      setLoading(true);
      setError(null);
      try {
        setProviders(await fetchLocalModels());
      } catch (e: any) {
        setError(e?.message || 'Failed to reach local providers');
        setProviders(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const pick = (providerId: string, model: string) => {
    onSelect(`${providerId}::${model}`);
    setOpen(false);
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

        {!loading && error && (
          <div className="px-3 py-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && providers && providers.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No local providers running. Start LM Studio (or Ollama) and reopen this menu.
          </div>
        )}

        {!loading && !error && providers && providers.length > 0 && (
          <ScrollArea className="max-h-72">
            <div className="py-1">
              {providers.map((provider) => (
                <div key={provider.id}>
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {provider.name}
                  </div>
                  {provider.models.map((model) => {
                    const value = `${provider.id}::${model}`;
                    const selected = value === current;
                    return (
                      <button
                        key={value}
                        onClick={() => pick(provider.id, model)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-accent/40 transition-colors"
                      >
                        <span className="truncate">{model}</span>
                        {selected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {configured && (
          <div className="border-t border-border/50">
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-accent/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove local agent
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AddLocalAgentButton;
