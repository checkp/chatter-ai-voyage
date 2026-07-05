
import React, { useState } from 'react';
import { Plus, Check, Monitor, Loader2, Trash2, PlugZap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchLocalModels, type LocalProvider } from '@/services/aiApiService';
import { prettifyModelName } from '@/lib/prettifyModelName';
import type { AIPlatform } from '@/types/chat';

interface AddLocalAgentButtonProps {
  localPlatform?: AIPlatform;
  onSelect: (model: string | null) => void;
}

type TestResult =
  | { kind: 'ok'; count: number; providers: string[] }
  | { kind: 'error'; message: string; hint: 'cors' | 'https' | 'offline' | 'other' };

/**
 * "+" button at the end of the agents bar. Opens a popover listing the local
 * providers (LM Studio / Ollama) discovered directly from the browser (the
 * hosted edge function can't reach the user's localhost). Picking a model
 * enables the Local agent with it. A "Test connection" button runs the same
 * probe on demand and surfaces actionable CORS/HTTPS troubleshooting.
 */
const AddLocalAgentButton: React.FC<AddLocalAgentButtonProps> = ({ localPlatform, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<LocalProvider[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const configured = !!localPlatform?.selectedModel;
  const current = localPlatform?.selectedModel ?? '';
  const pageIsHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const discover = async () => {
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
  };

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next) {
      setTestResult(null);
      await discover();
    }
  };

  // Classify a browser-side fetch failure into the most likely cause so we can
  // show the user a concrete fix instead of a generic "network error".
  const classifyFailure = (err: unknown): TestResult['hint'] => {
    const msg = err instanceof Error ? err.message : String(err);
    // Browsers hide the real reason for CORS/mixed-content failures behind a
    // generic TypeError. Use the page protocol as the tie-breaker.
    if (pageIsHttps) return 'https';
    if (/Failed to fetch|Load failed|NetworkError|TypeError/i.test(msg)) return 'cors';
    return 'other';
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const endpoints = [
      { name: 'LM Studio', url: 'http://localhost:1234/v1/models' },
      { name: 'Ollama', url: 'http://localhost:11434/v1/models' },
    ];
    const reached: string[] = [];
    let totalModels = 0;
    let lastErr: unknown = null;

    for (const ep of endpoints) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(ep.url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) { lastErr = new Error(`${ep.name} responded ${res.status}`); continue; }
        const json = await res.json();
        const models = (json.data ?? json.models ?? []).length;
        if (models > 0) { reached.push(ep.name); totalModels += models; }
      } catch (e) {
        lastErr = e;
      }
    }

    if (reached.length > 0) {
      setTestResult({ kind: 'ok', count: totalModels, providers: reached });
      // Refresh the model list too so the user sees the new state immediately.
      await discover();
    } else {
      const hint = lastErr ? classifyFailure(lastErr) : 'offline';
      const message = lastErr instanceof Error ? lastErr.message : 'No local provider responded on ports 1234 or 11434.';
      setTestResult({ kind: 'error', message, hint });
    }
    setTesting(false);
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
      <PopoverContent align="start" className="w-96 p-0">
        <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Local models</span>
          </div>
          <button
            onClick={runTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-border/60 hover:bg-accent/40 transition-colors disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlugZap className="h-3 w-3" />}
            Test connection
          </button>
        </div>

        {testResult?.kind === 'ok' && (
          <div className="mx-3 mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Reached {testResult.providers.join(' + ')} — found {testResult.count} model{testResult.count === 1 ? '' : 's'}.
            </span>
          </div>
        )}

        {testResult?.kind === 'error' && (
          <div className="mx-3 mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="break-words">{testResult.message}</span>
            </div>
            <div className="pl-5 space-y-1 text-[11px] leading-relaxed text-foreground/80">
              {testResult.hint === 'https' && (
                <>
                  <p className="font-semibold text-foreground">Mixed content blocked</p>
                  <p>This site is on HTTPS, and most browsers block requests to <code className="font-mono">http://localhost</code>.</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Chrome / Edge: usually work — check the URL bar shield icon and allow insecure content for this site.</li>
                    <li>Safari / Firefox: expose your local server over HTTPS via a tunnel (e.g. <code className="font-mono">ngrok http 1234</code>) and open the site over that tunnel host, or run this app locally.</li>
                  </ul>
                </>
              )}
              {testResult.hint === 'cors' && (
                <>
                  <p className="font-semibold text-foreground">Blocked by CORS or the server isn't running</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li><strong>LM Studio:</strong> Developer tab → start the server on port 1234 → enable <em>"CORS"</em> (Serve on Local Network / Enable CORS toggle).</li>
                    <li><strong>Ollama:</strong> stop it, then start with <code className="font-mono">OLLAMA_ORIGINS="*" ollama serve</code> (or set the env var permanently).</li>
                    <li>Confirm the port: LM Studio = 1234, Ollama = 11434.</li>
                  </ul>
                </>
              )}
              {testResult.hint === 'offline' && (
                <>
                  <p className="font-semibold text-foreground">No local server responded</p>
                  <p>Start LM Studio's server (Developer tab) or run <code className="font-mono">ollama serve</code>, then test again.</p>
                </>
              )}
              {testResult.hint === 'other' && (
                <p>Open the browser devtools Network tab and retry to see the exact failure.</p>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 px-3 py-6 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Scanning local providers…
          </div>
        )}

        {!loading && error && (
          <div className="px-3 py-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && providers && providers.length === 0 && !testResult && (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No local providers running. Start LM Studio (or Ollama) and hit <em>Test connection</em>.
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
                        <span className="truncate" title={model}>{prettifyModelName(model)}</span>
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
