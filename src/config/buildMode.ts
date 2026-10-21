// Build mode — agents run a small compound-engineering loop (plan → implement →
// test → review) over ONE self-contained artifact.
// The artifact lives in the message stream (platform = ARTIFACT_PLATFORM), so it
// gets persistence, RLS and free version history for nothing.

export const ARTIFACT_PLATFORM = 'artifact_panel';

import { STARTER_FULLSTACK, isBundle } from '@/lib/fullstack';

export type ArtifactLang = 'html' | 'python' | 'fullstack';

/** Stage in the compound-engineering pipeline. */
export type BuildRole = 'plan' | 'implement' | 'test' | 'review';

export const ROLE_LABEL: Record<BuildRole, string> = {
  plan: 'Orchestrator',
  implement: 'Implementer',
  test: 'QA engineer',
  review: 'Reviewer',
};

export const STARTER_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New app</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; display: grid; place-items: center; min-height: 100vh; background: #0f172a; color: #e7ecf5; }
      p { opacity: .7 }
    </style>
  </head>
  <body>
    <main>
      <h1>Nothing built yet</h1>
      <p>Describe the app you want and the agents will plan, build, test and review it.</p>
    </main>
  </body>
</html>`;

export const STARTER_PYTHON = `# Nothing built yet — describe what you want and the agents will start writing Python.
# This runs real CPython in your browser via Pyodide. numpy, pandas, matplotlib,
# scipy, scikit-learn and friends are available.

print("Hello from CPython in the browser")


def test_placeholder():
    assert 1 + 1 == 2
`;

export const starterCode = (lang: ArtifactLang) =>
  lang === 'python' ? STARTER_PYTHON : lang === 'fullstack' ? STARTER_FULLSTACK : STARTER_HTML;

/* ------------------------------------------------------------- test harness */

const PYTHON_TEST_CONTRACT = `Testing contract (non-negotiable — this is a TDD harness, it really runs):
- Ship the tests INSIDE the same script, as module-level functions named \`test_*\` taking no arguments.
- Use plain \`assert\` with a message. A test fails by raising; it passes by returning.
- Tests must be deterministic, fast (<1s each), offline, and must not print noise.
- Cover the behaviour the human asked for, plus at least one edge case and one regression guard per bug fixed.
- Keep the script's normal output (prints/plots) above the test functions; the harness calls every \`test_*\` after the script runs. Do NOT call them yourself.`;

const HTML_TEST_CONTRACT = `Testing contract (non-negotiable — this is a TDD harness, it really runs):
- Register tests with the injected global: \`RH.test('name', () => { ... })\`. It exists at runtime; guard with \`if (window.RH)\` so the standalone page still works.
- Helpers available: \`RH.assert(cond, msg)\` and \`RH.assertEqual(actual, expected, msg)\`. Throwing anything fails the test. Async test functions are awaited.
- Test real behaviour through the DOM: query elements, dispatch \`click\`/\`input\` events, then assert on rendered state — not on internals.
- Tests must be deterministic and offline, run after \`load\`, and must leave the UI in a usable state (clean up what you mutate).
- Cover the behaviour the human asked for, plus one edge case and one regression guard per bug fixed.`;

const HTML_RULES = `1. Reply with a COMPLETE, standalone HTML document inside a single \`\`\`html fenced code block. No partial diffs, no placeholders, no "rest unchanged" comments.
2. Everything inline: CSS in <style>, JS in <script>. No build step, no local files. External CDN scripts are allowed but keep them minimal.
3. It must run correctly when dropped into an iframe with no network guarantees. No server calls, no API keys.
4. Preserve everything that already works, including existing tests. Apply only the change that was asked for, plus obvious fixes.
5. Keep it small, polished and accessible. Sensible colours, keyboard support, mobile-friendly.

${HTML_TEST_CONTRACT}`;

const PYTHON_RULES = `1. Reply with a COMPLETE, runnable Python script inside a single \`\`\`python fenced code block. No partial diffs, no placeholders, no "rest unchanged" comments.
2. The script runs as CPython 3 inside Pyodide in the browser (WebAssembly). It must run top-to-bottom with no arguments and no user input (\`input()\` is unavailable).
3. Available out of the box: the standard library plus numpy, pandas, matplotlib, scipy, scikit-learn, sympy, networkx, pillow and other Pyodide-bundled wheels. NO network access, NO real file system, no subprocess, no threads, no tkinter/pygame.
4. Show results with \`print(...)\`. For charts use matplotlib and simply create the figures — do NOT call \`plt.show()\` or \`savefig\`; the panel captures every open figure automatically.
5. Preserve everything that already works, including existing tests. Apply only the change that was asked for, plus obvious fixes. Keep the script self-contained and readable, with logic in small pure functions so it is testable.

${PYTHON_TEST_CONTRACT}`;

const FULLSTACK_TEST_CONTRACT = `Testing contract (non-negotiable — this is a TDD harness, it really runs):
- Backend: module-level \`test_*\` functions in backend/app.py using the in-process client: \`r = client.post('/api/items', {"name": "x"})\`, then assert on \`r.status\` and \`r.json\`. The database is reset to a fresh copy of the schema before EVERY test, so each test seeds its own data.
- Frontend: pages may register \`RH.test('name', async () => { ... })\` (guard with \`if (window.RH)\`). Pages talk to the REAL backend during tests, so test the full loop: fill a form, click, await the fetch, assert the rendered DOM. Helpers: \`RH.assert\`, \`RH.assertEqual\`. Poll briefly for async UI updates instead of fixed sleeps.
- Deterministic, offline, fast. Cover every acceptance criterion plus edge cases (validation errors, 404s, empty lists).`;

const FULLSTACK_RULES = `1. Reply with the COMPLETE project inside ONE \`\`\`project fenced block. Inside it, start every file with a marker line exactly like \`=== file: backend/app.py ===\`, followed by the file's full contents. Always return EVERY file, even unchanged ones. No partial diffs, no placeholders, no nested code fences.
2. Layout:
   - \`db/schema.sql\` — SQLite schema. Use \`CREATE TABLE IF NOT EXISTS\`; seed rows with \`INSERT OR IGNORE\` if needed.
   - \`backend/app.py\` — API routes in Python 3, standard library only. Import from the provided runtime: \`from rh import get, post, put, patch, delete, query, one, execute, HTTPError, client\`. Routes: \`@get("/api/items/<id>")\` on \`def handler(req)\`; \`req.params\`, \`req.query\`, \`req.json\`. Return a dict/list (200), \`(body, status)\`, or \`raise HTTPError(404, "not found")\`. DB: \`query(sql, params)\` → list of dicts, \`one(...)\` → dict or None, \`execute(...)\` → lastrowid. Always use \`?\` parameters, never string-format SQL. All routes live under \`/api/\`. Extra helper modules may go in \`backend/<name>.py\`. Do NOT write backend/rh.py.
   - \`frontend/*.html\` — one file per page (\`index.html\` is the entry). Optional shared \`frontend/style.css\` / \`frontend/app.js\` linked with relative \`<link href="style.css">\` / \`<script src="app.js"></script>\`. Pages call the backend with \`fetch('/api/...')\` and link to each other with relative hrefs like \`about.html\`. No build step, no frameworks that need bundling.
3. The project runs in two places with the same code: an in-browser preview (Pyodide + in-memory SQLite) and a downloaded copy served by \`python server.py\`. So: no third-party Python packages, no threads, no network calls from the backend, no secrets.
4. Preserve everything that already works, including existing tests. Apply only the change that was asked for, plus obvious fixes. Keep pages polished, accessible and mobile-friendly; show loading and error states for API calls.

${FULLSTACK_TEST_CONTRACT}`;

const RULES: Record<ArtifactLang, string> = {
  html: HTML_RULES, python: PYTHON_RULES, fullstack: FULLSTACK_RULES,
};
const CONTRACT: Record<ArtifactLang, string> = {
  html: HTML_TEST_CONTRACT, python: PYTHON_TEST_CONTRACT, fullstack: FULLSTACK_TEST_CONTRACT,
};

/* ------------------------------------------------------------------- roles */

const ROLE_BRIEF: Record<BuildRole, string> = {
  plan: `Your stage: ORCHESTRATE. Do NOT write the app.
Produce a tight build order the other agents will follow, in markdown, under 200 words:
- **Goal** — one sentence.
- **Acceptance criteria** — 3-6 checkable statements, each phrased so it maps directly onto one test.
- **Work items** — numbered, smallest-viable-change first, each with the file-level or function-level target.
- **Risks** — what is most likely to break, and the regression test that would catch it.
Delegate explicitly: name which criteria are behaviour tests versus edge cases. No code fences at all.`,

  implement: `Your stage: IMPLEMENT. Follow the plan and the acceptance criteria. Write the code AND the tests that prove each criterion, in the same artifact. Red-green discipline: if a criterion has no test, it is not done. Before the code block, write at most 2 short sentences on what you changed and which criteria are now covered. Nothing after the code block.`,

  test: `Your stage: QA / TEST HARDENING. The implementation exists; your job is to make the suite trustworthy, not to redesign the app.
- Keep the implementation intact unless a test exposes a real defect — then fix the smallest thing that makes it pass.
- Add the missing tests: uncovered acceptance criteria, boundary values, empty/zero/negative inputs, repeated interactions, and anything the plan flagged as risky.
- Delete nothing that passes. Never weaken an assertion or delete a failing test to go green — fix the code instead.
Before the code block, list in one or two sentences the tests you added. Nothing after the code block.`,

  review: `Your stage: REVIEW / VALIDATE. You are the gate. You have the harness results.
- If tests are failing: fix the root cause (not the assertion) and return the corrected full artifact.
- If everything is green: verify the acceptance criteria are genuinely covered by real assertions, not by tests that would pass on a broken build. Tighten weak tests, remove dead code, fix accessibility or correctness slips, then return the full artifact.
- If you truly change nothing, still return the current artifact verbatim in the code block and say so.
Before the code block, write your verdict in at most 2 sentences: what you validated and what you changed. Nothing after the code block.`,
};

export interface BuildContext {
  agentName: string;
  role: BuildRole;
  lang: ArtifactLang;
  currentCode: string | null;
  /** The orchestrator's plan for this round. */
  plan?: string | null;
  /** Harness output from the previous attempt, if any. */
  harness?: string | null;
}

/** Instruction block prepended to every build-mode request. */
export const buildInstructions = ({
  agentName, role, lang, currentCode, plan, harness,
}: BuildContext) => {
  const thing = lang === 'python' ? 'Python program' : lang === 'fullstack' ? 'full-stack project (frontend pages + Python API routes + SQLite schema)' : 'web app';
  const artifactBlock = currentCode
    ? `Current version (iterate on THIS exact ${lang === 'python' ? 'script' : lang === 'fullstack' ? 'project' : 'document'}):\n\`\`\`${lang === 'fullstack' ? 'project' : lang}\n${currentCode}\n\`\`\``
    : `There is nothing yet — this is the first version.`;

  const parts = [
    `You are ${agentName}, acting as the ${ROLE_LABEL[role]} on a small team of AI agents working with a human inside RoboHeard "Build" mode. Together you iterate on ONE self-contained ${thing} using test-driven development: every claim about the code is backed by a test the harness actually executes.`,
    ROLE_BRIEF[role],
  ];

  if (role !== 'plan') {
    parts.push(`Hard rules:\n${RULES[lang]}`);
  } else {
    parts.push(CONTRACT[lang]);
  }

  if (plan) parts.push(`Build plan for this round (from the orchestrator — follow it):\n${plan}`);
  if (harness) parts.push(`Harness results from the last run (real execution, not a guess):\n${harness}`);
  parts.push(artifactBlock);

  return parts.join('\n\n');
};

const fenceFor = (reply: string, langs: string[]) => {
  const re = new RegExp('```(?:' + langs.join('|') + ')\\s*\\n([\\s\\S]*?)```', 'i');
  return reply.match(re)?.[1]?.trim() ?? null;
};

/** Pull the artifact + the agent's short note out of a model reply. */
export const extractArtifact = (
  reply: string,
  preferred: ArtifactLang = 'html',
): { code: string | null; lang: ArtifactLang; notes: string } => {
  if (preferred === 'fullstack') {
    let code = fenceFor(reply, ['project', 'fullstack']);
    if (!code && isBundle(reply)) {
      const start = reply.search(/^=== file: /m);
      code = reply.slice(start).replace(/```\s*$/, '').trim();
    }
    if (code && isBundle(code)) {
      const notes = reply.replace(/```[\s\S]*?```/g, '').replace(/^=== file: [\s\S]*/m, '').trim();
      return { code, lang: 'fullstack', notes };
    }
  }

  const pythonBlock = fenceFor(reply, ['python', 'py']);
  const htmlBlock = fenceFor(reply, ['html']);

  let lang: ArtifactLang = preferred;
  let code: string | null = null;

  if (preferred === 'python' || preferred === 'fullstack') {
    code = pythonBlock ?? htmlBlock;
    lang = pythonBlock ? 'python' : htmlBlock ? 'html' : 'python';
  } else {
    code = htmlBlock ?? pythonBlock;
    lang = htmlBlock ? 'html' : pythonBlock ? 'python' : 'html';
  }

  if (!code) {
    // Some models skip the language tag, or the fence entirely.
    const bare = reply.match(/```\s*\n([\s\S]*?)```/);
    code = bare?.[1]?.trim() ?? null;
    if (!code) {
      const raw = reply.match(/<!doctype html[\s\S]*<\/html>|<html[\s\S]*<\/html>/i);
      code = raw?.[0]?.trim() ?? null;
      if (code) lang = 'html';
    } else {
      lang = /<html[\s>]|<!doctype html/i.test(code) ? 'html' : preferred;
    }
  }

  if (code && lang === 'html' && !/<html[\s>]/i.test(code)) {
    // Fragment only — wrap it so the preview still works.
    code = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>\n<body>\n${code}\n</body>\n</html>`;
  }

  const notes = reply
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!doctype html[\s\S]*<\/html>/i, '')
    .trim();

  return { code, lang, notes };
};
