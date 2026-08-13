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
  FlaskConical, CheckCircle2, XCircle, Columns,
} from 'lucide-react';
import { starterCode, ROLE_LABEL, type ArtifactLang, type BuildRole } from '@/config/buildMode';
import { PyodideRunner } from '@/lib/pyodideRunner';
import {
  PYTHON_HARNESS, emptyReport, hasTests, parsePythonReport, runHtmlTests, summarise,
  type TestReport,
} from '@/lib/buildHarness';
import { collapseContext, diffLines, toSplitRows } from '@/lib/artifactDiff';
import ConsolePane, { type ConsoleLine } from '@/components/build/ConsolePane';
import type { ArtifactVersion, VerifyFn } from '@/hooks/useBuildMode';
import type { AIPlatform } from '@/types/chat';


interface ArtifactPanelProps {
  versions: ArtifactVersion[];
  lang: ArtifactLang;
  isBuilding: boolean;
  workingAgent: string | null;
  stage: BuildRole | null;
  platforms: AIPlatform[];
  onSaveEdit: (code: string, lang: ArtifactLang) => void;
  /** Hands the TDD harness up to the build loop so agents get real results. */
  registerVerify?: (fn: VerifyFn | null) => void;
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  versions, lang, isBuilding, workingAgent, stage, platforms, onSaveEdit, registerVerify,
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
  const [report, setReport] = useState<TestReport | null>(null);
  const [testing, setTesting] = useState(false);
  const [tab, setTab] = useState('code');
  const [diffView, setDiffView] = useState<'split' | 'unified'>('split');
  const [diffContext, setDiffContext] = useState(2);
  // What the selected revision is compared against: the one before it, the
  // first revision, the newest one, or a pinned revision id.
  const [baseline, setBaseline] = useState<string>('previous');

  const lineId = useRef(0);
  const runnerRef = useRef<PyodideRunner | null>(null);
  const outputRef = useRef('');

  const latest = versions[versions.length - 1] ?? null;
  const selectedIndex = useMemo(() => {
    const found = versions.findIndex(v => v.id === versionId);
    return found >= 0 ? found : versions.length - 1;
  }, [versions, versionId]);
  const selected = versions[selectedIndex] ?? null;

  const baselineIndex = useMemo(() => {
    if (baseline === 'previous') return selectedIndex - 1;
    if (baseline === 'first') return selectedIndex === 0 ? -1 : 0;
    if (baseline === 'latest') {
      const last = versions.length - 1;
      return last === selectedIndex ? selectedIndex - 1 : last;
    }
    const found = versions.findIndex(v => v.id === baseline);
    return found === selectedIndex ? selectedIndex - 1 : found;
  }, [baseline, selectedIndex, versions]);
  const previous = baselineIndex >= 0 ? versions[baselineIndex] ?? null : null;

  const activeLang: ArtifactLang = selected?.lang ?? lang;
  const code = draft ?? selected?.code ?? starterCode(activeLang);

  /** What this revision actually changed, relative to the one before it. */
  const diff = useMemo(
    () => (selected ? diffLines(previous?.code ?? '', selected.code) : null),
    [selected, previous],
  );
  const diffRows = useMemo(
    () => (diff ? collapseContext(diff.rows, diffContext) : []),
    [diff, diffContext],
  );
  const splitRows = useMemo(() => toSplitRows(diffRows), [diffRows]);


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

  /** Run the artifact's own test suite in the sandbox it lives in. */
  const runTests = useCallback(async (source: string, testLang: ArtifactLang): Promise<TestReport> => {
    setTesting(true);
    try {
      if (!hasTests(source, testLang)) {
        const missing = emptyReport(testLang);
        setReport(missing);
        return missing;
      }
      if (testLang === 'html') {
        const html = await runHtmlTests(source);
        setReport(html);
        return html;
      }
      push('system', '— tests —');
      const runResult = await getRunner().run(source, 'exec');
      if (runResult.error) {
        const crashed = emptyReport('python', runResult.error);
        setReport(crashed);
        push('stderr', runResult.error);
        return crashed;
      }
      const harness = await getRunner().run(PYTHON_HARNESS, 'exec');
      const parsed = harness.error
        ? emptyReport('python', harness.error)
        : parsePythonReport(harness.stdout, harness.ms);
      setReport(parsed);
      push('system', summarise(parsed));
      return parsed;
    } finally {
      setTesting(false);
    }
  }, [getRunner, push]);

  const verify = useCallback<VerifyFn>(async (source, verifyLang) => {
    const result = await runTests(source, verifyLang);
    setTab('tests');
    return result;
  }, [runTests]);

  useEffect(() => {
    registerVerify?.(verify);
    return () => registerVerify?.(null);
  }, [registerVerify, verify]);

  // Show the stored report for the revision being browsed — and clear it when
  // that revision has none, so an older version never wears a newer one's badge.
  useEffect(() => {
    setReport(selected?.tests ?? null);
    if (activeLang !== 'python') { setImages([]); setRunOutput(''); setLastRun(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);


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
            <SelectTrigger className="h-7 w-[280px] text-xs">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v, i) => {
                const prev = i > 0 ? versions[i - 1] : null;
                const delta = v.code.length - (prev?.code.length ?? 0);
                return (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    v{i + 1} · {agentName(v.author)}
                    {v.role ? ` · ${ROLE_LABEL[v.role]}` : ''}
                    {prev && v.code === prev.code
                      ? ' · no change'
                      : ` · ${delta >= 0 ? '+' : ''}${delta} chars`}
                    {i === versions.length - 1 ? ' · latest' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        {selected && versionId && selected.id !== latest?.id && (
          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => { setVersionId(null); setDraft(null); }}>
            Back to latest
          </Button>
        )}

        {versions.length > 1 && (
          <Select value={baseline} onValueChange={setBaseline}>
            <SelectTrigger className="h-7 w-[210px] text-xs" title="Diff baseline">
              <SelectValue placeholder="Compare against" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous" className="text-xs">vs previous revision</SelectItem>
              <SelectItem value="first" className="text-xs">vs first revision</SelectItem>
              <SelectItem value="latest" className="text-xs">vs latest revision</SelectItem>
              {versions.map((v, i) => (
                <SelectItem key={v.id} value={v.id} className="text-xs" disabled={v.id === selected?.id}>
                  vs v{i + 1} · {agentName(v.author)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {diff && (
          <Badge
            variant={diff.identical && previous ? 'outline' : 'secondary'}
            className="text-[10px]"
            title={previous ? `Change relative to v${baselineIndex + 1}` : 'No baseline revision'}
          >
            {!previous
              ? 'first revision'
              : diff.identical
                ? `identical to v${baselineIndex + 1}`
                : `+${diff.added} / −${diff.removed} lines`}
          </Badge>
        )}


        {isBuilding && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" />
            {agentName(workingAgent)} building
          </Badge>
        )}

        {isBuilding && stage && (
          <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[stage]}</Badge>
        )}

        {testing ? (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" /> running tests
          </Badge>
        ) : report && (
          <Badge variant={report.failed || report.error ? 'destructive' : report.missing ? 'outline' : 'secondary'} className="gap-1 text-[10px]">
            {report.failed || report.error ? <XCircle className="h-3 w-3" /> : report.missing ? null : <CheckCircle2 className="h-3 w-3" />}
            {summarise(report)}
          </Badge>
        )}

        {activeLang === 'python' && lastRun && !running && (
          <Badge variant={lastRun.ok ? 'secondary' : 'destructive'} className="text-[10px]">
            {lastRun.ok ? `ran in ${lastRun.ms} ms` : 'error'}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => { void runTests(code, activeLang); setTab('tests'); }}
            disabled={testing || running}
            title="Run the artifact's test suite"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
            Tests
          </Button>
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
          <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col">
            <TabsList className="mx-3 mt-2 h-8 w-fit shrink-0">
              <TabsTrigger value="code" className="h-6 px-3 text-xs">Code</TabsTrigger>
              <TabsTrigger value="diff" className="h-6 px-3 text-xs">
                Diff{diff && previous && !diff.identical ? ` +${diff.added}/−${diff.removed}` : ''}
              </TabsTrigger>
              <TabsTrigger value="tests" className="h-6 px-3 text-xs">
                Tests{report && !report.missing && !report.error ? ` ${report.passed}/${report.total}` : ''}
              </TabsTrigger>
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

            <TabsContent value="diff" className="m-0 min-h-0 flex-1 overflow-auto p-3 pt-2">
              {!selected ? (
                <p className="text-xs text-muted-foreground">Nothing built yet.</p>
              ) : !previous ? (
                <p className="text-xs text-muted-foreground">
                  This is the first revision (v1 by {agentName(selected.author)}) — there is nothing to compare it to.
                </p>
              ) : diff?.identical ? (
                <p className="text-xs text-muted-foreground">
                  {agentName(selected.author)} returned the artifact unchanged — byte-for-byte identical to v{selectedIndex}.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      v{selectedIndex + 1} ({agentName(selected.author)}
                      {selected.role ? `, ${ROLE_LABEL[selected.role]}` : ''}) vs v{selectedIndex} ({agentName(previous.author)}) ·
                      {' '}<span className="text-emerald-600 dark:text-emerald-400">+{diff?.added}</span>
                      {' / '}<span className="text-destructive">−{diff?.removed}</span> lines
                    </p>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => setDiffContext(c => (c === 2 ? 8 : c === 8 ? Number.MAX_SAFE_INTEGER : 2))}
                        title="How many unchanged lines to keep around each change"
                      >
                        Context: {diffContext === 2 ? 'tight' : diffContext === 8 ? 'wide' : 'full file'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 px-2 text-[10px]"
                        onClick={() => setDiffView(v => (v === 'split' ? 'unified' : 'split'))}
                      >
                        <Columns className="h-3 w-3" />
                        {diffView === 'split' ? 'Side by side' : 'Unified'}
                      </Button>
                    </div>
                  </div>

                  {diffView === 'split' ? (
                    <div className="overflow-x-auto rounded-md border border-border/60 bg-background/50">
                      <div className="grid grid-cols-2 border-b border-border/60 bg-muted/40 text-[10px] font-semibold text-muted-foreground">
                        <div className="border-r border-border/60 px-2 py-1">
                          v{selectedIndex} — {agentName(previous.author)} (before)
                        </div>
                        <div className="px-2 py-1">
                          v{selectedIndex + 1} — {agentName(selected.author)} (after)
                        </div>
                      </div>
                      <div className="font-mono text-[11px] leading-relaxed">
                        {splitRows.map((row, i) => {
                          if (row.kind === 'gap') {
                            return (
                              <div key={`gap-${i}`} className="bg-muted/40 px-2 py-0.5 text-center text-[10px] text-muted-foreground">
                                ⋯ {row.count} unchanged lines
                              </div>
                            );
                          }
                          const tone = (side: 'left' | 'right') => {
                            if (row.kind === 'ctx') return '';
                            if (row.kind === 'add') return side === 'right' ? 'bg-emerald-500/10' : 'bg-muted/30';
                            if (row.kind === 'del') return side === 'left' ? 'bg-destructive/10' : 'bg-muted/30';
                            return side === 'left' ? 'bg-destructive/10' : 'bg-emerald-500/10';
                          };
                          const cell = (side: 'left' | 'right') => {
                            const data = side === 'left' ? row.left : row.right;
                            const changed = row.kind !== 'ctx' && !!data;
                            const changedTint = side === 'left'
                              ? 'bg-destructive/30 text-destructive'
                              : 'bg-emerald-500/30 text-emerald-700 dark:text-emerald-300';
                            return (
                              <div className={`flex min-w-0 gap-2 px-2 ${tone(side)} ${side === 'left' ? 'border-r border-border/60' : ''}`}>
                                <span className="w-8 shrink-0 select-none text-right text-muted-foreground/60">
                                  {data?.line ?? ''}
                                </span>
                                <span className="w-2 shrink-0 select-none text-muted-foreground">
                                  {!data ? '' : row.kind === 'ctx' ? ' ' : side === 'left' ? '−' : '+'}
                                </span>
                                <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${changed ? '' : 'text-muted-foreground'}`}>
                                  {data
                                    ? data.segments.map((seg, k) => (
                                        <span key={k} className={seg.changed ? `rounded-sm ${changedTint}` : undefined}>
                                          {seg.text}
                                        </span>
                                      ))
                                    : ''}
                                </span>
                              </div>
                            );
                          };
                          return (
                            <div key={`${row.kind}-${i}`} className="grid grid-cols-2">
                              {cell('left')}
                              {cell('right')}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/50 font-mono text-[11px] leading-relaxed">
                      {diffRows.map((row, i) =>
                        row.kind === 'gap' ? (
                          <div key={`gap-${i}`} className="bg-muted/40 px-2 text-muted-foreground">⋯ {row.count} unchanged lines</div>
                        ) : (
                          <div
                            key={`${row.kind}-${i}`}
                            className={
                              row.kind === 'add'
                                ? 'bg-emerald-500/10 px-2 text-emerald-600 dark:text-emerald-400'
                                : row.kind === 'del'
                                  ? 'bg-destructive/10 px-2 text-destructive'
                                  : 'px-2 text-muted-foreground'
                            }
                          >
                            {row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : ' '} {row.text || ' '}
                          </div>
                        ),
                      )}
                    </pre>
                  )}
                </div>
              )}
            </TabsContent>



            <TabsContent value="tests" className="m-0 min-h-0 flex-1 overflow-y-auto p-3 pt-2">
              {!report ? (
                <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                  <div>
                    <p>No harness run yet. Agents run this suite on every revision.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => void runTests(code, activeLang)} disabled={testing}>
                      <FlaskConical className="mr-1.5 h-3.5 w-3.5" /> Run tests
                    </Button>
                  </div>
                </div>
              ) : report.error ? (
                <pre className="whitespace-pre-wrap break-words rounded-md border border-destructive/40 bg-destructive/5 p-3 font-mono text-[11px]">
                  {report.error}
                </pre>
              ) : report.missing ? (
                <p className="text-xs text-muted-foreground">
                  This revision ships no tests, so nothing could be verified. Ask the agents for a test suite —
                  {activeLang === 'python' ? ' module-level `test_*` functions.' : ' `RH.test(name, fn)` registrations.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    {summarise(report)} · {report.ms} ms · proof of work for v{versions.findIndex(v => v.id === selected?.id) + 1 || versions.length}
                  </p>
                  {report.cases.map(c => (
                    <div key={c.name} className="flex items-start gap-2 rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
                      {c.ok
                        ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />}
                      <div className="min-w-0">
                        <p className="font-mono text-[11px]">{c.name}{c.ms != null ? ` · ${c.ms} ms` : ''}</p>
                        {!c.ok && c.message && (
                          <p className="break-words font-mono text-[10px] text-destructive">{c.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
