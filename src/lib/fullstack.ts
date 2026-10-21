// Full-stack Build target: a multi-file project (frontend pages + Python API
// routes + SQLite schema) stored as ONE bundle string so versioning, diffs and
// persistence keep working exactly like single-file artifacts.
//
// The same `rh` runtime powers the in-browser preview (Pyodide) and the
// downloadable project (plain CPython stdlib server).

export interface ProjectFile { path: string; content: string }

const MARKER = /^=== file: (.+?) ===[ \t]*$/;

export const parseBundle = (code: string): ProjectFile[] => {
  const files: ProjectFile[] = [];
  let current: ProjectFile | null = null;
  for (const line of code.split('\n')) {
    const m = line.match(MARKER);
    if (m) {
      current = { path: m[1].trim().replace(/^\.?\//, ''), content: '' };
      files.push(current);
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
  }
  return files.map(f => ({ ...f, content: f.content.replace(/\s+$/, '') + '\n' }));
};

export const serializeBundle = (files: ProjectFile[]): string =>
  files.map(f => `=== file: ${f.path} ===\n${f.content.replace(/\s+$/, '')}\n`).join('\n');

export const isBundle = (code: string) => code.split('\n').some(l => MARKER.test(l));

export const projectParts = (files: ProjectFile[]) => {
  const schema = files.filter(f => /^db\/.+\.sql$/.test(f.path)).map(f => f.content).join('\n');
  const backend = files.filter(f => /^backend\/[\w-]+\.py$/.test(f.path));
  const app = backend.find(f => f.path === 'backend/app.py') ?? null;
  const modules = backend.filter(f => f !== app && f.path !== 'backend/rh.py');
  const pages = files.filter(f => /^frontend\/.+\.html?$/.test(f.path)).map(f => f.path);
  return { schema, app, modules, pages };
};

/** Python string literal (JSON escapes are valid Python). */
const lit = (s: string) => JSON.stringify(s);

/* ------------------------------------------------------------ rh runtime */

export const RH_RUNTIME = `"""rh: tiny routing + SQLite runtime shared by the RoboHeard preview and the exported server."""
import json as _json
import re
import sqlite3
from urllib.parse import urlsplit, parse_qsl

_routes = []
_schema = ""
_db_path = ":memory:"
db = None


class HTTPError(Exception):
    def __init__(self, status, message="error"):
        super().__init__(message)
        self.status = status
        self.message = message


class Request:
    def __init__(self, method, path, params, query, body):
        self.method, self.path, self.params, self.query, self.body = method, path, params, query, body

    @property
    def json(self):
        if not self.body:
            return None
        return _json.loads(self.body) if isinstance(self.body, (str, bytes)) else self.body


def route(path, methods=("GET",)):
    clean = path.rstrip("/") or "/"
    pattern = re.compile("^" + re.sub(r"<(\\w+)>", r"(?P<\\1>[^/]+)", clean) + "/?$")

    def deco(fn):
        _routes.append((tuple(m.upper() for m in methods), pattern, fn))
        return fn
    return deco


def get(path): return route(path, ("GET",))
def post(path): return route(path, ("POST",))
def put(path): return route(path, ("PUT",))
def patch(path): return route(path, ("PATCH",))
def delete(path): return route(path, ("DELETE",))


def init_db(schema, path=":memory:"):
    global db, _schema, _db_path
    _schema, _db_path = schema, path
    db = sqlite3.connect(path, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(schema)
    db.commit()
    return db


def reset_db():
    """Fresh in-memory database from the schema (used between tests)."""
    if db is not None:
        db.close()
    init_db(_schema, ":memory:")


def query(sql, params=()):
    return [dict(r) for r in db.execute(sql, params).fetchall()]


def one(sql, params=()):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=()):
    cur = db.execute(sql, params)
    db.commit()
    return cur.lastrowid


def dispatch(method, url, body=None):
    parts = urlsplit(url)
    path = parts.path.rstrip("/") or "/"
    q = dict(parse_qsl(parts.query))
    method = method.upper()
    matched = False
    for methods, pattern, fn in _routes:
        m = pattern.match(path)
        if not m:
            continue
        matched = True
        if method not in methods:
            continue
        try:
            out = fn(Request(method, path, m.groupdict(), q, body))
        except HTTPError as e:
            return e.status, {"error": e.message}
        except Exception as e:
            return 500, {"error": "%s: %s" % (type(e).__name__, e)}
        if isinstance(out, tuple):
            return out[1], out[0]
        return (200 if out is not None else 204), out
    if matched:
        return 405, {"error": "method not allowed"}
    return 404, {"error": "no route for %s %s" % (method, path)}


def dispatch_json(method, url, body=None):
    status, payload = dispatch(method, url, body)
    return _json.dumps({"status": status, "body": payload}, default=str)


class Response:
    def __init__(self, status, payload):
        self.status = self.status_code = status
        self.json = payload


class _Client:
    """In-process test client: client.get('/api/x'), client.post('/api/x', {...})."""
    def request(self, method, url, body=None):
        status, payload = dispatch(method, url, None if body is None else _json.dumps(body))
        return Response(status, _json.loads(_json.dumps(payload, default=str)))
    def get(self, url): return self.request("GET", url)
    def post(self, url, body=None): return self.request("POST", url, body)
    def put(self, url, body=None): return self.request("PUT", url, body)
    def patch(self, url, body=None): return self.request("PATCH", url, body)
    def delete(self, url): return self.request("DELETE", url)


client = _Client()


def snapshot(limit=50):
    out = {}
    for row in query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
        name = row["name"]
        cur = db.execute('SELECT * FROM "%s" LIMIT %d' % (name.replace('"', '""'), limit))
        cols = [d[0] for d in cur.description or []]
        count = db.execute('SELECT COUNT(*) FROM "%s"' % name.replace('"', '""')).fetchone()[0]
        out[name] = {"columns": cols, "rows": [list(r) for r in cur.fetchall()], "count": count}
    return _json.dumps(out, default=str)
`;

/** Imports of every backend file, hidden under `if False` so Pyodide preloads wheels. */
const importHints = (srcs: string[]) => {
  const lines = srcs
    .flatMap(s => s.split('\n'))
    .filter(l => /^\s*(import|from)\s+\w/.test(l) && !/\b(rh|app)\b/.test(l.split('import')[0] + ' ' + (l.match(/^\s*import\s+(\w+)/)?.[1] ?? '')))
    .map(l => '    ' + l.trim());
  return `if False:\n    import sqlite3\n${lines.join('\n')}`;
};

/** Python that boots the whole backend inside Pyodide. */
export const pyodidePrelude = (files: ProjectFile[]) => {
  const { schema, app, modules } = projectParts(files);
  const name = (p: string) => p.replace(/^backend\//, '').replace(/\.py$/, '');
  return [
    importHints([app?.content ?? '', ...modules.map(m => m.content)]),
    'import sys, types',
    'def _rh_mod(name, src):',
    '    m = types.ModuleType(name)',
    '    m.__file__ = name + ".py"',
    '    sys.modules[name] = m',
    '    exec(compile(src, name + ".py", "exec"), m.__dict__)',
    '    return m',
    `_rh_mod("rh", ${lit(RH_RUNTIME)})`,
    'import rh',
    `rh.init_db(${lit(schema)})`,
    ...modules.map(m => `_rh_mod(${lit(name(m.path))}, ${lit(m.content)})`),
    app ? `exec(compile(${lit(app.content)}, "app.py", "exec"), globals())` : '',
  ].join('\n');
};

export const FULLSTACK_HARNESS = `
def _rh_run_tests():
    import json, time, traceback, rh
    names = sorted(k for k, v in list(globals().items()) if k.startswith("test_") and callable(v))
    cases = []
    for name in names:
        rh.reset_db()
        started = time.time()
        try:
            globals()[name]()
            cases.append({"name": name, "ok": True, "ms": int((time.time() - started) * 1000)})
        except Exception as exc:
            detail = traceback.format_exc(limit=2).strip().splitlines()
            cases.append({"name": name, "ok": False, "ms": int((time.time() - started) * 1000),
                          "message": (detail[-1] if detail else "%s: %s" % (type(exc).__name__, exc))[:400]})
    rh.reset_db()
    print("__RH_TESTS__" + json.dumps(cases))

_rh_run_tests()
`;

export const dispatchCall = (method: string, url: string, body: string | null) =>
  `rh.dispatch_json(${lit(method)}, ${lit(url)}, ${body == null ? 'None' : lit(body)})`;

/* --------------------------------------------------------------- frontend */

/** In-iframe bridge: /api fetches and page links are relayed to the host. */
export const BRIDGE_SHIM = `<script>(function(){
  var seq = 0, waiting = {};
  window.addEventListener('message', function (e) {
    var d = e.data && e.data.__rhApiReply;
    if (d && waiting[d.id]) { var w = waiting[d.id]; delete waiting[d.id]; w(d); }
  });
  var real = window.fetch ? window.fetch.bind(window) : null;
  var apiPath = function (u) {
    var p = String(u).replace(/^[a-z]+:\\/\\/[^/]+/i, '').replace(/^about:srcdoc/, '');
    if (p.charAt(0) !== '/') p = '/' + p.replace(/^\\.\\//, '');
    return /^\\/api(\\/|\\?|$)/.test(p) ? p : null;
  };
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var path = apiPath(url);
    if (!path) return real ? real(input, init) : Promise.reject(new Error('offline'));
    init = init || {};
    var body = init.body == null ? null : (typeof init.body === 'string' ? init.body : JSON.stringify(init.body));
    var id = ++seq;
    return new Promise(function (resolve) {
      waiting[id] = function (r) {
        var empty = r.status === 204 || r.status === 304 || r.body == null;
        resolve(new Response(empty ? null : JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } }));
      };
      parent.postMessage({ __rhApi: { id: id, method: String(init.method || 'GET').toUpperCase(), url: path, body: body } }, '*');
    });
  };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (!h || /^(https?:|mailto:|tel:|#|javascript:)/i.test(h)) return;
    e.preventDefault();
    parent.postMessage({ __rhNav: h }, '*');
  }, true);
})();</script>`;

const dirOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');

const resolveAsset = (files: ProjectFile[], from: string, href: string) => {
  const clean = href.split(/[?#]/)[0];
  const target = clean.startsWith('/') ? 'frontend' + clean : dirOf(from) + clean.replace(/^\.\//, '');
  return files.find(f => f.path === target) ?? null;
};

/** Page link → bundle path (frontend/*.html), or null if it isn't a project page. */
export const resolvePage = (files: ProjectFile[], from: string, href: string): string | null => {
  let clean = href.split(/[?#]/)[0];
  if (!clean || clean === '/') clean = '/index.html';
  const base = clean.startsWith('/') ? 'frontend' + clean : dirOf(from) + clean.replace(/^\.\//, '');
  const candidates = [base, base.replace(/\/$/, '') + '.html', base.replace(/\/?$/, '/') + 'index.html'];
  return candidates.find(c => files.some(f => f.path === c)) ?? null;
};

/** One page as a standalone document: local CSS/JS inlined, API bridge injected. */
export const renderPage = (files: ProjectFile[], path: string): string => {
  const page = files.find(f => f.path === path);
  if (!page) return `<!doctype html><body style="font-family:system-ui;padding:2rem">Page not found: ${path}</body>`;
  let html = page.content;
  html = html.replace(/<link\b[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (tag, href) => {
    const f = resolveAsset(files, path, href);
    return f ? `<style>\n${f.content}\n</style>` : tag;
  });
  html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+\.js)["']([^>]*)><\/script>/gi, (tag, a, src, b) => {
    const f = resolveAsset(files, path, src);
    return f ? `<script${a}${b}>\n${f.content.replace(/<\/script/gi, '<\\/script')}\n</script>` : tag;
  });
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, m => m + '\n' + BRIDGE_SHIM)
    : BRIDGE_SHIM + '\n' + html;
};

/* ----------------------------------------------------------------- export */

const SERVER_PY = `"""Run the project locally:  python server.py   then open http://localhost:8000

Standard library only. Pages are served from ./frontend, /api/* goes to the
routes in ./backend/app.py, data lives in ./data.sqlite3 (schema in ./db/).
"""
import glob
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")
sys.path.insert(0, BACKEND)

import rh  # noqa: E402

schema = "\\n".join(open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(ROOT, "db", "*.sql"))))
rh.init_db(schema, os.environ.get("RH_DB", os.path.join(ROOT, "data.sqlite3")))

import app  # noqa: E402,F401  (registers the routes)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND, **kwargs)

    def _api(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode("utf-8") if length else None
        status, payload = rh.dispatch(self.command, self.path, body)
        data = b"" if payload is None else json.dumps(payload, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith("/api"):
            return self._api()
        return super().do_GET()

    do_POST = do_PUT = do_PATCH = do_DELETE = _api


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print("Serving on http://localhost:%d" % port)
    HTTPServer(("", port), Handler).serve_forever()
`;

const RUN_TESTS_PY = `"""Run the backend test suite:  python run_tests.py"""
import glob
import os
import sys
import traceback

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "backend"))
import rh  # noqa: E402

rh.init_db("\\n".join(open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(ROOT, "db", "*.sql")))))
import app  # noqa: E402

failed = 0
for name in sorted(n for n in dir(app) if n.startswith("test_")):
    rh.reset_db()
    try:
        getattr(app, name)()
        print("PASS", name)
    except Exception:
        failed += 1
        print("FAIL", name)
        traceback.print_exc(limit=2)
sys.exit(1 if failed else 0)
`;

const README = `# RoboHeard full-stack project

Generated in RoboHeard Build mode.

- \`frontend/\` — pages (HTML/CSS/JS). They call the API with \`fetch('/api/...')\`.
- \`backend/app.py\` — API routes (Python, \`rh\` decorators) and backend tests.
- \`db/schema.sql\` — SQLite schema.

\`\`\`
python server.py      # http://localhost:8000
python run_tests.py   # backend tests
\`\`\`

Python 3.9+, standard library only.
`;

export const exportFiles = (files: ProjectFile[]): ProjectFile[] => [
  ...files.filter(f => f.path !== 'backend/rh.py'),
  { path: 'backend/rh.py', content: RH_RUNTIME },
  { path: 'server.py', content: SERVER_PY },
  { path: 'run_tests.py', content: RUN_TESTS_PY },
  ...(files.some(f => f.path === 'README.md') ? [] : [{ path: 'README.md', content: README }]),
];

export const buildZip = async (files: ProjectFile[]): Promise<Blob> => {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const f of exportFiles(files)) zip.file(`roboheard-project/${f.path}`, f.content);
  return zip.generateAsync({ type: 'blob' });
};

export const STARTER_FULLSTACK = serializeBundle([
  {
    path: 'db/schema.sql',
    content: `CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL
);`,
  },
  {
    path: 'backend/app.py',
    content: `from rh import get, post, query, execute, client

# Nothing built yet — describe the app and the agents will write pages,
# API routes and the database schema.


@get("/api/notes")
def list_notes(req):
    return query("SELECT id, text FROM notes ORDER BY id")


@post("/api/notes")
def add_note(req):
    new_id = execute("INSERT INTO notes (text) VALUES (?)", (req.json["text"],))
    return {"id": new_id, "text": req.json["text"]}, 201


def test_add_and_list():
    assert client.post("/api/notes", {"text": "hi"}).status == 201
    assert client.get("/api/notes").json == [{"id": 1, "text": "hi"}]`,
  },
  {
    path: 'frontend/index.html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>New project</title>
  <style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem}</style>
</head>
<body>
  <h1>Nothing built yet</h1>
  <p>Describe a full-stack app — pages, API and database — and the agents will build it.</p>
</body>
</html>`,
  },
]);
