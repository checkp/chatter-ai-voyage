
## Python target (v2.13.0)
- Build mode has a `lang` target: `html` (web app) or `python`. Artifact payload is `JSON {code, lang, author}` (legacy rows used `{html, author}` — still parsed).
- Python runs in the browser via **Pyodide** (`https://cdn.jsdelivr.net/pyodide/v314.0.4/full/`), in a blob Web Worker created with `{ type: 'module' }` and `await import(CDN + 'pyodide.mjs')`. `importScripts` + classic workers do NOT work in this environment — always use a module worker.
- One long-lived interpreter per panel, so the console REPL shares globals with the script. `terminate()` is the only way to stop a runaway loop.
- Packages come from `loadPackagesFromImports` (bundled wheels only, no network in the script).
- matplotlib figures are captured automatically after each run (`_rh_capture_figures()` → base64 PNGs); agents must NOT call `plt.show()`/`savefig`.
- Artifact panel is a vertical split: artifact stage on top (iframe for HTML, output+figures for Python), code browser + console tabs below.

## Full-stack target (v2.15)
- `lang: 'fullstack'` artifact = one bundle string with `=== file: path ===` markers (db/*.sql, backend/app.py + helpers, frontend/*.html/css/js). Agents reply in one ```project block, always every file.
- Same `rh` Python runtime (routes + sqlite3) runs in Pyodide for preview and in the exported ZIP (`server.py`, `run_tests.py`, stdlib only).
- Preview iframe fetches to /api and page links are bridged to the host via postMessage; DB reset before each backend test.
