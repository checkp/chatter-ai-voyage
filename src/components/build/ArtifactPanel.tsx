import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Download, ExternalLink, RotateCw, Save, Loader2, Smartphone, Monitor, Play, Square,
} from 'lucide-react';
import { starterCode, type ArtifactLang } from '@/config/buildMode';
import { PyodideRunner } from '@/lib/pyodideRunner';
import ConsolePane, { type ConsoleLine } from '@/components/build/ConsolePane';
import type { ArtifactVersion } from '@/hooks/useBuildMode';
import type { AIPlatform } from '@/types/chat';

interface ArtifactPanelProps {
  versions: ArtifactVersion[];
  lang: ArtifactLang;
  isBuilding: boolean;
  workingAgent: string | null;
  platforms: AIPlatform[];
  onSaveEdit: (code: string, lang: ArtifactLang) => void;
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  versions, lang, isBuilding, workingAgent, platforms, onSaveEdit,
}) => {
  const [versionId, setVersionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [narrow, setNarrow] = useState(false);

  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [booted, setBooted] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [runOutput, setRunOutput] = useState('');
  const [lastRun, setLastRun] = useState<{ ok: boolean; ms: number } | null>(null);

  const lineId = useRef(0);
  const runnerRef = useRef<PyodideRunner | null>(null);
  const outputRef = useRef('');

  const latest = versions[versions.length - 1] ?? null;
  const selected = useMemo(
    () => versions.find(v => v.id === versionId) ?? latest,
    [versions, versionId, latest],
  );

  const activeLang: ArtifactLang = selected?.lang ?? lang;
  const code = draft ?? selected?.code ?? starterCode(activeLang);

  // Follow the newest revision unless the user pinned an older one.
  useEffect(() => {
    setVersionId(null);
    setDraft(null);
  }, [latest?.id]);

  const push = useCallback((stream: ConsoleLine['stream'], text: string) => {
    if (!text) return;
    setLines(prev => [...prev.slice(-400), { id: ++lineId.current, stream, text }]);
  }, []);

  const getRunner = useCallback(() => {
    if (!runnerRef.current) {
      runnerRef.current = new PyodideRunner(
        ({ stream, text }) => {
          push(stream, text);
          if (stream === 'stdout' || stream === 'stderr') {
            outputRef.current += (outputRef.current ? '\n' : '') + text;
            setRunOutput(outputRef.current);
          }
        },
        (version) => { setBooted(true); push('system', `Pyodide ${version} ready`); },
      );
    }
    return runnerRef.current;
  }, [push]);

  useEffect(() => () => runnerRef.current?.terminate(), []);

  const runPython = useCallback(async (source: string) => {
    setRunning(true);
    setImages([]);
    outputRef.current = '';
    setRunOutput('');
    push('system', '— run —');
    const result = await getRunner().run(source, 'exec');
    if (result.packages.length) push('system', `loaded: ${result.packages.join(', ')}`);
    if (result.error) push('stderr', result.error);
    setImages(result.images);
    setLastRun({ ok: result.ok, ms: result.ms });
    setRunning(false);
  }, [getRunner, push]);

  const evalPython = useCallback(async (source: string) => {
    push('input', source);
    setRunning(true);
    const result = await getRunner().run(source, 'eval');
    if (result.error) push('stderr', result.error);
    else if (result.value) push('value', result.value);
    if (result.images.length) setImages(result.images);
    setRunning(false);
  }, [getRunner, push]);

  // Re-run automatically once the interpreter is warm and a new revision lands.
  useEffect(() => {
    if (activeLang !== 'python' || !booted || !selected?.code) return;
    void runPython(selected.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, activeLang, booted]);

  const stop = () => {
    runnerRef.current?.terminate();
    runnerRef.current = null;
    setRunning(false);
    setBooted(false);
    push('system', 'Interpreter stopped.');
  };

  const agentName = (id: string | null) =>
    id === 'you' ? 'you' : platforms.find(p => p.id === id)?.name ?? id ?? 'agent';

  const download = () => {
    const isPy = activeLang === 'python';
    const url = URL.createObjectURL(new Blob([code], { type: isPy ? 'text/x-python' : 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = isPy ? 'roboheard-app.py' : 'roboheard-app.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInTab = () => {
    const win = window.open('', '_blank', 'noopener');
    if (!win) return;
    win.document.write(activeLang === 'python' ? `<pre>${code.replace(/[<&]/g, c => (c === '<' ? '&lt;' : '&amp;'))}</pre>` : code);
    win.document.close();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-secondary/30">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          {activeLang === 'python' ? 'Python' : 'Artifact'}
        </span>

        {versions.length > 0 && (
          <Select
            value={selected?.id ?? ''}
            onValueChange={(v) => { setVersionId(v); setDraft(null); }}
          >
            <SelectTrigger className="h-7 w-[190px] text-xs">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v, i) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  v{i + 1} · {agentName(v.author)}
                  {i === versions.length - 1 ? ' (latest)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isBuilding && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" />
            {agentName(workingAgent)} building
          </Badge>
        )}

        {activeLang === 'python' && lastRun && !running && (
          <Badge variant={lastRun.ok ? 'secondary' : 'destructive'} className="text-[10px]">
            {lastRun.ok ? `ran in ${lastRun.ms} ms` : 'error'}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1">
          {activeLang === 'python' ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => runPython(code)} disabled={running}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={stop} title="Stop / restart interpreter" disabled={!runnerRef.current}>
                <Square className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setNarrow(n => !n)} title={narrow ? 'Desktop width' : 'Mobile width'}>
                {narrow ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setReloadKey(k => k + 1)} title="Reload preview">
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openInTab} title="Open in new tab">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={download} title="Download">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Top half — the artifact itself */}
        <ResizablePanel defaultSize={58} minSize={20} className="min-h-0">
          {activeLang === 'python' ? (
            <div className="h-full overflow-y-auto p-3">
              {images.length > 0 && (
                <div className="mb-3 grid gap-3">
                  {images.map((src, i) => (
                    <img
                      key={i}
                      src={`data:image/png;base64,${src}`}
                      alt={`Figure ${i + 1}`}
                      className="w-full rounded-md border border-border bg-white"
                    />
                  ))}
                </div>
              )}
              {runOutput ? (
                <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
                  {runOutput}
                </pre>
              ) : (
                images.length === 0 && (
                  <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                    <div>
                      <p>{booted ? 'No output yet.' : 'CPython runs here, in your browser.'}</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => runPython(code)} disabled={running}>
                        {running ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                        {booted ? 'Run script' : 'Load Pyodide & run'}
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="h-full p-3">
              <div className={`h-full ${narrow ? 'mx-auto w-[390px] max-w-full' : 'w-full'}`}>
                <iframe
                  key={`${selected?.id ?? 'starter'}-${reloadKey}`}
                  title="App preview"
                  srcDoc={code}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  className="h-full w-full rounded-md border border-border bg-white"
                />
              </div>
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Bottom half — code browser + console */}
        <ResizablePanel defaultSize={42} minSize={15} className="min-h-0">
          <Tabs defaultValue="code" className="flex h-full min-h-0 flex-col">
            <TabsList className="mx-3 mt-2 h-8 w-fit shrink-0">
              <TabsTrigger value="code" className="h-6 px-3 text-xs">Code</TabsTrigger>
              <TabsTrigger value="console" className="h-6 px-3 text-xs">Console</TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="m-0 flex min-h-0 flex-1 flex-col gap-2 p-3 pt-2">
              <Textarea
                value={code}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none font-mono text-[11px] leading-relaxed"
              />
              <div className="flex items-center justify-end gap-2">
                {draft !== null && (
                  <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
                )}
                <Button
                  size="sm"
                  onClick={() => { onSaveEdit(code, activeLang); setDraft(null); }}
                  disabled={draft === null}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save revision
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="console" className="m-0 min-h-0 flex-1 border-t border-border/60">
              <ConsolePane
                lines={lines}
                busy={running}
                onEval={evalPython}
                onClear={() => setLines([])}
                onReset={() => { runnerRef.current?.reset(); setImages([]); }}
              />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default ArtifactPanel;
