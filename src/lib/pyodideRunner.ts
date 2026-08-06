// Pyodide runner — CPython in a Web Worker, loaded from the jsDelivr CDN.
// One long-lived interpreter per panel so the console REPL shares state with
// the artifact script. https://pyodide.org/en/stable/

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v314.0.4/full/';

export interface PyRunResult {
  ok: boolean;
  error?: string;
  value?: string;
  images: string[];
  packages: string[];
  ms: number;
}

type StreamHandler = (chunk: { stream: 'stdout' | 'stderr' | 'system'; text: string }) => void;

const WORKER_SOURCE = `
const CDN = ${JSON.stringify(PYODIDE_CDN)};
importScripts(CDN + 'pyodide.js');

let pyodide = null;
let booting = null;

const send = (msg) => self.postMessage(msg);

const BOOTSTRAP = \`
import os, sys
os.environ.setdefault("MPLBACKEND", "AGG")

def _rh_capture_figures():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return []
    import io, base64
    out = []
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", dpi=140, bbox_inches="tight")
        out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")
    return out
\`;

async function boot() {
  if (pyodide) return pyodide;
  if (booting) return booting;
  booting = (async () => {
    send({ type: 'stream', stream: 'system', text: 'Loading CPython (Pyodide)…' });
    pyodide = await loadPyodide({ indexURL: CDN });
    pyodide.setStdout({ batched: (text) => send({ type: 'stream', stream: 'stdout', text }) });
    pyodide.setStderr({ batched: (text) => send({ type: 'stream', stream: 'stderr', text }) });
    await pyodide.runPythonAsync(BOOTSTRAP);
    send({ type: 'ready', version: pyodide.version });
    return pyodide;
  })();
  return booting;
}

async function run(id, code, mode) {
  const started = Date.now();
  let packages = [];
  try {
    const py = await boot();
    const before = new Set(Object.keys(py.loadedPackages || {}));
    try {
      await py.loadPackagesFromImports(code, {
        messageCallback: (text) => send({ type: 'stream', stream: 'system', text }),
        errorCallback: () => {},
      });
    } catch (e) {
      send({ type: 'stream', stream: 'system', text: 'Package load skipped: ' + (e && e.message ? e.message : e) });
    }
    packages = Object.keys(py.loadedPackages || {}).filter((p) => !before.has(p));

    let value;
    if (mode === 'eval') {
      const result = await py.runPythonAsync(code);
      if (result !== undefined && result !== null) {
        value = String(py.globals.get('repr')(result));
        if (result && typeof result.destroy === 'function') result.destroy();
      }
    } else {
      await py.runPythonAsync(code);
    }

    let images = [];
    try {
      const figs = await py.runPythonAsync('_rh_capture_figures()');
      images = figs && figs.toJs ? figs.toJs() : [];
      if (figs && figs.destroy) figs.destroy();
    } catch (_) { /* matplotlib not in play */ }

    send({ type: 'result', id, ok: true, value, images, packages, ms: Date.now() - started });
  } catch (e) {
    send({
      type: 'result', id, ok: false,
      error: e && e.message ? e.message : String(e),
      images: [], packages, ms: Date.now() - started,
    });
  }
}

self.onmessage = async (event) => {
  const data = event.data || {};
  if (data.type === 'boot') { boot().catch((e) => send({ type: 'fatal', error: String(e) })); return; }
  if (data.type === 'run') { run(data.id, data.code, data.mode || 'exec'); return; }
  if (data.type === 'reset') {
    try {
      const py = await boot();
      py.globals.clear();
      await py.runPythonAsync(BOOTSTRAP);
      send({ type: 'stream', stream: 'system', text: 'Interpreter reset.' });
    } catch (e) {
      send({ type: 'stream', stream: 'stderr', text: String(e) });
    }
  }
};
`;

export class PyodideRunner {
  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private seq = 0;
  private pending = new Map<number, (r: PyRunResult) => void>();
  private onStream: StreamHandler;
  private onReady: (version: string) => void;

  constructor(onStream: StreamHandler, onReady: (version: string) => void) {
    this.onStream = onStream;
    this.onReady = onReady;
  }

  private ensure() {
    if (this.worker) return this.worker;
    this.blobUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(this.blobUrl);
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'stream') {
        this.onStream({ stream: data.stream, text: data.text });
      } else if (data.type === 'ready') {
        this.onReady(data.version);
      } else if (data.type === 'fatal') {
        this.onStream({ stream: 'stderr', text: data.error });
      } else if (data.type === 'result') {
        const resolve = this.pending.get(data.id);
        this.pending.delete(data.id);
        resolve?.({
          ok: data.ok,
          error: data.error,
          value: data.value,
          images: data.images ?? [],
          packages: data.packages ?? [],
          ms: data.ms ?? 0,
        });
      }
    };
    worker.onerror = (e) => this.onStream({ stream: 'stderr', text: e.message || 'Worker error' });
    this.worker = worker;
    return worker;
  }

  boot() {
    this.ensure().postMessage({ type: 'boot' });
  }

  run(code: string, mode: 'exec' | 'eval' = 'exec') {
    const worker = this.ensure();
    const id = ++this.seq;
    return new Promise<PyRunResult>((resolve) => {
      this.pending.set(id, resolve);
      worker.postMessage({ type: 'run', id, code, mode });
    });
  }

  reset() {
    this.ensure().postMessage({ type: 'reset' });
  }

  /** Hard stop — the only way to interrupt a runaway loop in Pyodide. */
  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = null;
  }
}
