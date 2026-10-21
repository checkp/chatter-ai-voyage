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
export const renderPage = (files: ProjectFile[], path: string, query = ''): string => {
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
  // srcdoc iframes have no real URL, so page params (model.html?slug=…) arrive
  // through this global instead of location.search.
  const shim = `<script>window.__RH_QUERY__=${JSON.stringify(query)};</script>` + BRIDGE_SHIM;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, m => m + '\n' + shim)
    : shim + '\n' + html;
};

/** Split a page href into its path and query (for in-preview navigation). */
export const splitHref = (href: string) => {
  const hashless = href.split('#')[0];
  const i = hashless.indexOf('?');
  return i === -1
    ? { path: hashless, query: '' }
    : { path: hashless.slice(0, i), query: hashless.slice(i + 1) };
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

/* --------------------------------------------------------- herd template */

/**
 * "Herd backend" — a ready-made full-stack project: a models page, model
 * details, chat history and a small admin backend over the nine herd models.
 * Loadable from Build mode as a starting point for iteration.
 */
export const STARTER_HERD = serializeBundle([
  {
    path: 'db/schema.sql',
    content: `CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'frontier',
  context_k INTEGER NOT NULL DEFAULT 128,
  input_cost REAL NOT NULL DEFAULT 0,
  output_cost REAL NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO models (slug, name, provider, tier, context_k, input_cost, output_cost) VALUES
  ('gpt-6.1-sol', 'GPT-6.1 Sol', 'OpenAI', 'frontier', 1050, 2.0, 10.0),
  ('claude-sonnet-5-5', 'Claude Sonnet 5.5', 'Anthropic', 'frontier', 1000, 2.0, 10.0),
  ('gemini-4-argon', 'Gemini 4 Argon', 'Google', 'frontier', 1000, 2.0, 10.0),
  ('grok-4.7', 'Grok 4.7', 'xAI', 'frontier', 500, 2.0, 6.0),
  ('deepseek-flash', 'DeepSeek V4.1 Flash', 'DeepSeek', 'reasoning', 1000, 0.28, 0.42),
  ('mistral-large-4', 'Mistral Large 4', 'Mistral', 'frontier', 1000, 0.68, 2.09),
  ('sonar', 'Perplexity Sonar', 'Perplexity', 'search', 127, 1.0, 1.0),
  ('qwen3.8-max', 'Qwen3.8 Max', 'Alibaba', 'frontier', 1000, 1.6, 6.4),
  ('nim-nemotron-ultra', 'Nemotron 3 Ultra 550B', 'NVIDIA', 'open', 131, 0.9, 2.5);`,
  },
  {
    path: 'backend/app.py',
    content: `from rh import get, post, patch, delete, query, one, execute, HTTPError, client


def row_model(r):
    return {
        "slug": r["slug"], "name": r["name"], "provider": r["provider"],
        "tier": r["tier"], "context_k": r["context_k"],
        "input_cost": r["input_cost"], "output_cost": r["output_cost"],
        "enabled": bool(r["enabled"]),
    }


@get("/api/models")
def list_models(req):
    if req.query.get("enabled") in ("1", "true"):
        rows = query("SELECT * FROM models WHERE enabled = 1 ORDER BY provider, name")
    else:
        rows = query("SELECT * FROM models ORDER BY provider, name")
    return [row_model(r) for r in rows]


@get("/api/models/<slug>")
def model_detail(req):
    r = one("SELECT * FROM models WHERE slug = ?", (req.params["slug"],))
    if not r:
        raise HTTPError(404, "unknown model")
    chats = one("SELECT COUNT(*) AS n FROM chats WHERE model_id = ?", (r["id"],))
    return dict(row_model(r), chat_count=chats["n"])


@patch("/api/models/<slug>")
def update_model(req):
    r = one("SELECT * FROM models WHERE slug = ?", (req.params["slug"],))
    if not r:
        raise HTTPError(404, "unknown model")
    body = req.json or {}
    if "enabled" in body:
        execute("UPDATE models SET enabled = ? WHERE id = ?", (1 if body["enabled"] else 0, r["id"]))
    if str(body.get("name") or "").strip():
        execute("UPDATE models SET name = ? WHERE id = ?", (str(body["name"]).strip(), r["id"]))
    return model_detail(req)


@get("/api/chats")
def list_chats(req):
    return query(
        "SELECT c.id, c.title, c.created_at, m.slug AS model_slug, m.name AS model_name,"
        " (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) AS message_count"
        " FROM chats c JOIN models m ON m.id = c.model_id ORDER BY c.id DESC"
    )


@post("/api/chats")
def create_chat(req):
    body = req.json or {}
    title = str(body.get("title") or "").strip()
    if not title:
        raise HTTPError(400, "title is required")
    model = one("SELECT * FROM models WHERE slug = ?", (body.get("model_slug"),))
    if not model:
        raise HTTPError(404, "unknown model")
    if not model["enabled"]:
        raise HTTPError(400, "model is disabled")
    new_id = execute("INSERT INTO chats (title, model_id) VALUES (?, ?)", (title, model["id"]))
    return {"id": new_id, "title": title, "model_slug": model["slug"]}, 201


@get("/api/chats/<cid>")
def chat_detail(req):
    c = one(
        "SELECT c.id, c.title, c.created_at, m.slug AS model_slug, m.name AS model_name"
        " FROM chats c JOIN models m ON m.id = c.model_id WHERE c.id = ?",
        (req.params["cid"],),
    )
    if not c:
        raise HTTPError(404, "chat not found")
    c["messages"] = query(
        "SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY id", (c["id"],))
    return c


@post("/api/chats/<cid>/messages")
def add_message(req):
    c = one("SELECT id FROM chats WHERE id = ?", (req.params["cid"],))
    if not c:
        raise HTTPError(404, "chat not found")
    body = req.json or {}
    role = body.get("role")
    content = str(body.get("content") or "").strip()
    if role not in ("user", "assistant", "system"):
        raise HTTPError(400, "role must be user, assistant or system")
    if not content:
        raise HTTPError(400, "content is required")
    new_id = execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (c["id"], role, content))
    return {"id": new_id, "chat_id": c["id"], "role": role, "content": content}, 201


@delete("/api/chats/<cid>")
def delete_chat(req):
    c = one("SELECT id FROM chats WHERE id = ?", (req.params["cid"],))
    if not c:
        raise HTTPError(404, "chat not found")
    execute("DELETE FROM chats WHERE id = ?", (c["id"],))
    return None, 204


@get("/api/admin/stats")
def admin_stats(req):
    return {
        "models": one("SELECT COUNT(*) AS n FROM models")["n"],
        "models_enabled": one("SELECT COUNT(*) AS n FROM models WHERE enabled = 1")["n"],
        "chats": one("SELECT COUNT(*) AS n FROM chats")["n"],
        "messages": one("SELECT COUNT(*) AS n FROM messages")["n"],
        "per_model": query(
            "SELECT m.slug, m.name, m.enabled,"
            " (SELECT COUNT(*) FROM chats c WHERE c.model_id = m.id) AS chats,"
            " (SELECT COUNT(*) FROM messages msg JOIN chats c2 ON c2.id = msg.chat_id"
            "  WHERE c2.model_id = m.id) AS messages"
            " FROM models m ORDER BY messages DESC, chats DESC"
        ),
    }


def test_models_seeded_with_nine():
    r = client.get("/api/models")
    assert r.status == 200
    assert len(r.json) == 9, "the herd has nine models"


def test_model_detail_and_404():
    r = client.get("/api/models/gpt-6.1-sol")
    assert r.status == 200 and r.json["provider"] == "OpenAI"
    assert r.json["chat_count"] == 0
    assert client.get("/api/models/nope").status == 404


def test_chat_lifecycle():
    created = client.post("/api/chats", {"title": "probe", "model_slug": "grok-4.7"})
    assert created.status == 201
    cid = created.json["id"]
    msg = client.post("/api/chats/%s/messages" % cid, {"role": "user", "content": "hello herd"})
    assert msg.status == 201
    detail = client.get("/api/chats/%s" % cid)
    assert detail.json["messages"][0]["content"] == "hello herd"
    assert client.delete("/api/chats/%s" % cid).status == 204
    assert client.get("/api/chats/%s" % cid).status == 404


def test_validation_errors():
    assert client.post("/api/chats", {"title": "", "model_slug": "grok-4.7"}).status == 400
    assert client.post("/api/chats", {"title": "x", "model_slug": "nope"}).status == 404
    cid = client.post("/api/chats", {"title": "v", "model_slug": "gpt-6.1-sol"}).json["id"]
    assert client.post("/api/chats/%s/messages" % cid, {"role": "robot", "content": "x"}).status == 400
    assert client.post("/api/chats/%s/messages" % cid, {"role": "user", "content": " "}).status == 400


def test_disabled_model_refuses_chats():
    assert client.patch("/api/models/qwen3.8-max", {"enabled": False}).json["enabled"] is False
    r = client.post("/api/chats", {"title": "x", "model_slug": "qwen3.8-max"})
    assert r.status == 400 and "disabled" in r.json["error"]
    enabled_only = client.get("/api/models?enabled=1").json
    assert all(m["enabled"] for m in enabled_only) and len(enabled_only) == 8


def test_admin_stats_counts():
    cid = client.post("/api/chats", {"title": "s", "model_slug": "sonar"}).json["id"]
    client.post("/api/chats/%s/messages" % cid, {"role": "user", "content": "hi"})
    stats = client.get("/api/admin/stats").json
    assert stats["models"] == 9 and stats["chats"] == 1 and stats["messages"] == 1
    sonar = [m for m in stats["per_model"] if m["slug"] == "sonar"][0]
    assert sonar["chats"] == 1 and sonar["messages"] == 1`,
  },
  {
    path: 'frontend/style.css',
    content: `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  font-family: system-ui, sans-serif; margin: 0; background: #0d1117; color: #e6edf3;
  min-height: 100vh;
}
a { color: #7ee0a3; text-decoration: none; }
a:hover { text-decoration: underline; }
header {
  display: flex; align-items: center; gap: 1rem; padding: .8rem 1.2rem;
  border-bottom: 1px solid #21262d; background: #010409; position: sticky; top: 0;
}
header .brand { font-weight: 700; color: #e6edf3; }
header nav { display: flex; gap: .9rem; font-size: .85rem; }
main { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1.2rem 3rem; }
h1 { font-size: 1.5rem; margin: .2rem 0 1rem; }
.muted { color: #8b949e; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: .8rem; }
.card {
  border: 1px solid #21262d; border-radius: .6rem; padding: .9rem 1rem;
  background: #0d1117; display: block; color: inherit;
}
.card:hover { border-color: #7ee0a3; text-decoration: none; }
.card h3 { margin: 0 0 .3rem; font-size: 1rem; }
.badge {
  display: inline-block; font-size: .68rem; padding: .1rem .45rem; border-radius: 1rem;
  border: 1px solid #30363d; color: #8b949e; margin-right: .3rem;
}
.dot { display: inline-block; width: .5rem; height: .5rem; border-radius: 50%; margin-right: .3rem; }
.dot.on { background: #3fb950; } .dot.off { background: #f85149; }
button, input, select {
  font: inherit; border-radius: .4rem; border: 1px solid #30363d;
  background: #0d1117; color: #e6edf3; padding: .4rem .7rem;
}
button { cursor: pointer; background: #21262d; }
button:hover { border-color: #7ee0a3; }
button.danger:hover { border-color: #f85149; color: #f85149; }
form.row { display: flex; gap: .5rem; margin: 1rem 0; flex-wrap: wrap; }
form.row input { flex: 1; min-width: 12rem; }
table { width: 100%; border-collapse: collapse; font-size: .85rem; }
th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid #21262d; }
th { color: #8b949e; font-weight: 600; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: .8rem; margin-bottom: 1.2rem; }
.stat { border: 1px solid #21262d; border-radius: .6rem; padding: .8rem 1rem; }
.stat b { display: block; font-size: 1.4rem; }
.msg { border-left: 3px solid #30363d; padding: .3rem .8rem; margin: .5rem 0; }
.msg.user { border-color: #7ee0a3; }
.msg.assistant { border-color: #58a6ff; }
.msg .role { font-size: .7rem; text-transform: uppercase; color: #8b949e; }
.err { color: #f85149; }
.chat-head { display: flex; align-items: center; gap: .6rem; }`,
  },
  {
    path: 'frontend/app.js',
    content: `// Shared helpers for the Herd pages.
function qs() {
  return new URLSearchParams(window.__RH_QUERY__ || window.location.search);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
async function api(path, opts) {
  opts = opts || {};
  if (opts.body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(opts.body);
  }
  var r = await fetch(path, opts);
  if (r.status === 204) return null;
  var data = await r.json();
  if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data;
}
function money(n) { return '$' + Number(n).toFixed(2); }`,
  },
  {
    path: 'frontend/index.html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Herd — Models</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <span class="brand">🐑 The Herd</span>
    <nav>
      <a href="index.html">Models</a>
      <a href="history.html">Chat history</a>
      <a href="admin.html">Admin</a>
    </nav>
  </header>
  <main>
    <h1>Models</h1>
    <p class="muted">Nine frontier models, one herd. Pick one to see details or start a chat.</p>
    <div id="list" class="grid">Loading…</div>
  </main>
  <script src="app.js"></script>
  <script>
    async function load() {
      var list = document.getElementById('list');
      try {
        var models = await api('/api/models');
        list.innerHTML = models.map(function (m) {
          return '<a class="card" href="model.html?slug=' + encodeURIComponent(m.slug) + '">'
            + '<h3><span class="dot ' + (m.enabled ? 'on' : 'off') + '"></span>' + esc(m.name) + '</h3>'
            + '<span class="badge">' + esc(m.provider) + '</span>'
            + '<span class="badge">' + esc(m.tier) + '</span>'
            + '<p class="muted">' + m.context_k + 'k context · ' + money(m.input_cost) + ' / ' + money(m.output_cost) + ' per 1M tok</p>'
            + '</a>';
        }).join('');
      } catch (e) {
        list.innerHTML = '<p class="err">' + esc(e.message) + '</p>';
      }
    }
    load();
  </script>
</body>
</html>`,
  },
  {
    path: 'frontend/model.html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Herd — Model</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <span class="brand">🐑 The Herd</span>
    <nav>
      <a href="index.html">Models</a>
      <a href="history.html">Chat history</a>
      <a href="admin.html">Admin</a>
    </nav>
  </header>
  <main>
    <div id="detail">Loading…</div>
    <form class="row" id="newchat" hidden>
      <input id="title" placeholder="Name the new chat…" required />
      <button type="submit">Start chat</button>
    </form>
    <p id="msg" class="err"></p>
  </main>
  <script src="app.js"></script>
  <script>
    var slug = qs().get('slug');
    async function load() {
      var el = document.getElementById('detail');
      if (!slug) { el.innerHTML = '<p class="err">No model selected.</p>'; return; }
      try {
        var m = await api('/api/models/' + encodeURIComponent(slug));
        el.innerHTML = '<h1><span class="dot ' + (m.enabled ? 'on' : 'off') + '"></span>' + esc(m.name) + '</h1>'
          + '<p><span class="badge">' + esc(m.provider) + '</span><span class="badge">' + esc(m.tier) + '</span>'
          + '<span class="badge">' + (m.enabled ? 'enabled' : 'disabled') + '</span></p>'
          + '<table>'
          + '<tr><th>Context window</th><td>' + m.context_k + 'k tokens</td></tr>'
          + '<tr><th>Input cost</th><td>' + money(m.input_cost) + ' / 1M tokens</td></tr>'
          + '<tr><th>Output cost</th><td>' + money(m.output_cost) + ' / 1M tokens</td></tr>'
          + '<tr><th>Chats with this model</th><td>' + m.chat_count + '</td></tr>'
          + '</table>';
        document.getElementById('newchat').hidden = !m.enabled;
      } catch (e) {
        el.innerHTML = '<p class="err">' + esc(e.message) + '</p>';
      }
    }
    document.getElementById('newchat').addEventListener('submit', async function (e) {
      e.preventDefault();
      var out = document.getElementById('msg');
      out.textContent = '';
      try {
        await api('/api/chats', { method: 'POST', body: { title: document.getElementById('title').value, model_slug: slug } });
        window.location.href = 'history.html';
      } catch (err) { out.textContent = err.message; }
    });
    load();
  </script>
</body>
</html>`,
  },
  {
    path: 'frontend/history.html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Herd — Chat history</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <span class="brand">🐑 The Herd</span>
    <nav>
      <a href="index.html">Models</a>
      <a href="history.html">Chat history</a>
      <a href="admin.html">Admin</a>
    </nav>
  </header>
  <main>
    <h1>Chat history</h1>
    <div id="chats">Loading…</div>
  </main>
  <script src="app.js"></script>
  <script>
    async function openChat(id, box) {
      box.innerHTML = 'Loading…';
      try {
        var c = await api('/api/chats/' + id);
        box.innerHTML = '<div class="chat-head"><h3>' + esc(c.title) + '</h3>'
          + '<span class="badge">' + esc(c.model_name) + '</span></div>'
          + (c.messages.length
            ? c.messages.map(function (m) {
                return '<div class="msg ' + esc(m.role) + '"><span class="role">' + esc(m.role) + '</span><br>' + esc(m.content) + '</div>';
              }).join('')
            : '<p class="muted">No messages yet.</p>');
      } catch (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
    }
    async function load() {
      var list = document.getElementById('chats');
      try {
        var chats = await api('/api/chats');
        if (!chats.length) { list.innerHTML = '<p class="muted">No chats yet — start one from a model page.</p>'; return; }
        list.innerHTML = '';
        chats.forEach(function (c) {
          var card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = '<div class="chat-head"><h3>' + esc(c.title) + '</h3>'
            + '<span class="badge">' + esc(c.model_name) + '</span>'
            + '<span class="muted">' + c.message_count + ' messages</span>'
            + '<button class="danger" style="margin-left:auto">Delete</button></div>'
            + '<div class="body" hidden></div>';
          var body = card.querySelector('.body');
          card.querySelector('h3').style.cursor = 'pointer';
          card.querySelector('h3').addEventListener('click', function () {
            body.hidden = !body.hidden;
            if (!body.hidden) openChat(c.id, body);
          });
          card.querySelector('button').addEventListener('click', async function () {
            await api('/api/chats/' + c.id, { method: 'DELETE' });
            load();
          });
          list.appendChild(card);
        });
      } catch (e) { list.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
    }
    load();
  </script>
</body>
</html>`,
  },
  {
    path: 'frontend/admin.html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Herd — Admin</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <span class="brand">🐑 The Herd</span>
    <nav>
      <a href="index.html">Models</a>
      <a href="history.html">Chat history</a>
      <a href="admin.html">Admin</a>
    </nav>
  </header>
  <main>
    <h1>Backend admin</h1>
    <div id="stats" class="stats">Loading…</div>
    <h2>Per-model usage</h2>
    <div id="models">Loading…</div>
  </main>
  <script src="app.js"></script>
  <script>
    async function toggle(slug, enabled) {
      await api('/api/models/' + encodeURIComponent(slug), { method: 'PATCH', body: { enabled: enabled } });
      load();
    }
    async function load() {
      try {
        var s = await api('/api/admin/stats');
        document.getElementById('stats').innerHTML =
          '<div class="stat"><b>' + s.models + '</b>models</div>'
          + '<div class="stat"><b>' + s.models_enabled + '</b>enabled</div>'
          + '<div class="stat"><b>' + s.chats + '</b>chats</div>'
          + '<div class="stat"><b>' + s.messages + '</b>messages</div>';
        document.getElementById('models').innerHTML = '<table>'
          + '<tr><th>Model</th><th>Status</th><th>Chats</th><th>Messages</th><th></th></tr>'
          + s.per_model.map(function (m) {
            return '<tr><td>' + esc(m.name) + '</td>'
              + '<td><span class="dot ' + (m.enabled ? 'on' : 'off') + '"></span>' + (m.enabled ? 'enabled' : 'disabled') + '</td>'
              + '<td>' + m.chats + '</td><td>' + m.messages + '</td>'
              + '<td><button data-slug="' + esc(m.slug) + '" data-enabled="' + (m.enabled ? '0' : '1') + '">'
              + (m.enabled ? 'Disable' : 'Enable') + '</button></td></tr>';
          }).join('') + '</table>';
        document.querySelectorAll('#models button').forEach(function (b) {
          b.addEventListener('click', function () { toggle(b.dataset.slug, b.dataset.enabled === '1'); });
        });
      } catch (e) {
        document.getElementById('stats').innerHTML = '<p class="err">' + esc(e.message) + '</p>';
      }
    }
    load();
  </script>
</body>
</html>`,
  },
]);
