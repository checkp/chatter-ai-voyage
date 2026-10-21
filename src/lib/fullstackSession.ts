// Live backend for a full-stack bundle: one Pyodide interpreter running the
// project's Python routes on an in-memory SQLite database.

import { PyodideRunner } from '@/lib/pyodideRunner';
import {
  FULLSTACK_HARNESS, dispatchCall, parseBundle, projectParts, pyodidePrelude, renderPage,
} from '@/lib/fullstack';
import {
  emptyReport, parsePythonReport, runHtmlTests, type ApiRequest, type TestCase, type TestReport,
} from '@/lib/buildHarness';

type Stream = (s: 'stdout' | 'stderr' | 'system', text: string) => void;

export interface TableSnapshot { columns: string[]; rows: unknown[][]; count: number }

export class FullstackSession {
  private runner: PyodideRunner;
  private ready: Promise<{ ok: boolean; error?: string }> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(onStream: Stream = () => {}) {
    this.runner = new PyodideRunner(({ stream, text }) => onStream(stream, text), () => {});
  }

  /** Serialise calls: the interpreter is single-threaded and shares globals. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  boot(code: string) {
    const files = parseBundle(code);
    this.ready = this.exclusive(async () => {
      const r = await this.runner.run(pyodidePrelude(files), 'exec');
      return { ok: r.ok, error: r.error };
    });
    return this.ready;
  }

  async request(req: Pick<ApiRequest, 'method' | 'url' | 'body'>): Promise<{ status: number; body: unknown }> {
    const boot = await this.ready;
    if (!boot?.ok) return { status: 503, body: { error: boot?.error ?? 'backend not running' } };
    return this.exclusive(async () => {
      const r = await this.runner.run(dispatchCall(req.method, req.url, req.body), 'raw');
      if (!r.ok || !r.value) return { status: 500, body: { error: r.error ?? 'no response' } };
      return JSON.parse(r.value) as { status: number; body: unknown };
    });
  }

  async snapshot(): Promise<Record<string, TableSnapshot>> {
    const boot = await this.ready;
    if (!boot?.ok) return {};
    return this.exclusive(async () => {
      const r = await this.runner.run('rh.snapshot()', 'raw');
      return r.ok && r.value ? JSON.parse(r.value) : {};
    });
  }

  resetData() {
    return this.exclusive(() => this.runner.run('rh.reset_db()', 'exec'));
  }

  /** Backend `test_*` functions, then every page's RH.test suite against the live API. */
  async verify(code: string): Promise<TestReport> {
    const started = Date.now();
    const files = parseBundle(code);
    const boot = await this.boot(code);
    if (!boot.ok) return { ...emptyReport('fullstack', boot.error ?? 'backend failed to start'), ms: Date.now() - started };

    const cases: TestCase[] = [];
    const api = await this.exclusive(() => this.runner.run(FULLSTACK_HARNESS, 'exec'));
    if (api.error) return { ...emptyReport('fullstack', api.error), ms: Date.now() - started };
    for (const c of parsePythonReport(api.stdout, api.ms).cases) cases.push({ ...c, name: `api › ${c.name}` });

    for (const page of projectParts(files).pages) {
      const src = files.find(f => f.path === page)?.content ?? '';
      const scripts = files.filter(f => f.path.endsWith('.js')).map(f => f.content).join('\n');
      if (!/RH\.test\s*\(/.test(src + scripts)) continue;
      await this.resetData();
      const report = await runHtmlTests(renderPage(files, page), 15000, req => this.request(req));
      const label = page.replace(/^frontend\//, '');
      if (report.error) cases.push({ name: `${label} › page`, ok: false, message: report.error });
      for (const c of report.cases) cases.push({ ...c, name: `${label} › ${c.name}` });
    }
    await this.resetData();

    const passed = cases.filter(c => c.ok).length;
    return {
      lang: 'fullstack', cases, total: cases.length, passed, failed: cases.length - passed,
      missing: cases.length === 0, ms: Date.now() - started,
    };
  }

  terminate() { this.runner.terminate(); }
}
