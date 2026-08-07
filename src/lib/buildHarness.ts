// TDD harness for Build mode.
//
// Agents don't get to *say* their code works — the harness runs their tests in
// the same sandbox the artifact runs in and reports machine-readable results
// back into the loop (and to the human as proof of work).

import type { ArtifactLang } from '@/config/buildMode';

export interface TestCase {
  name: string;
  ok: boolean;
  ms?: number;
  message?: string;
}

export interface TestReport {
  lang: ArtifactLang;
  cases: TestCase[];
  total: number;
  passed: number;
  failed: number;
  /** No test suite found in the artifact. */
  missing?: boolean;
  /** Harness/runtime failure (the artifact itself blew up). */
  error?: string;
  ms: number;
}

export const emptyReport = (lang: ArtifactLang, error?: string): TestReport => ({
  lang, cases: [], total: 0, passed: 0, failed: 0, missing: !error, error, ms: 0,
});

export const summarise = (report: TestReport | null | undefined): string => {
  if (!report) return 'not verified';
  if (report.error) return `harness error — ${report.error.split('\n')[0].slice(0, 160)}`;
  if (report.missing) return 'no tests found';
  return `${report.passed}/${report.total} passing${report.failed ? ` · ${report.failed} failing` : ''}`;
};

export const hasTests = (code: string, lang: ArtifactLang): boolean =>
  lang === 'python' ? /^\s*def\s+test_\w+\s*\(/m.test(code) : /RH\.test\s*\(/.test(code);

/** Failing cases rendered for a model prompt. */
export const failureDigest = (report: TestReport): string => {
  if (report.error) return `The artifact crashed before tests could finish:\n${report.error}`;
  if (report.missing) return 'The artifact ships no tests at all. Add a real suite.';
  const failed = report.cases.filter(c => !c.ok);
  if (!failed.length) return '';
  return failed.map(c => `- ${c.name}: ${c.message ?? 'failed'}`).join('\n');
};

/** Markdown proof-of-work block posted into the chat transcript. */
export const proofOfWork = (report: TestReport): string => {
  if (report.error) return `**QA gate — harness error**\n\n\`\`\`\n${report.error.slice(0, 900)}\n\`\`\``;
  if (report.missing) return '**QA gate — no tests found.** The artifact was not verified.';
  const rows = report.cases
    .map(c => `${c.ok ? '✅' : '❌'} \`${c.name}\`${c.ms != null ? ` · ${c.ms} ms` : ''}${c.ok ? '' : ` — ${c.message ?? 'failed'}`}`)
    .join('\n');
  return `**QA gate — ${report.passed}/${report.total} passing** (${report.ms} ms)\n\n${rows}`;
};

/* ------------------------------------------------------------------ Python */

export const PYTHON_HARNESS = `
def _rh_run_tests():
    import json, time, traceback
    names = sorted(k for k, v in list(globals().items()) if k.startswith("test_") and callable(v))
    cases = []
    for name in names:
        started = time.time()
        try:
            globals()[name]()
            cases.append({"name": name, "ok": True, "ms": int((time.time() - started) * 1000)})
        except Exception as exc:
            detail = traceback.format_exc(limit=2).strip().splitlines()
            cases.append({
                "name": name, "ok": False, "ms": int((time.time() - started) * 1000),
                "message": (detail[-1] if detail else "%s: %s" % (type(exc).__name__, exc))[:400],
            })
    print("__RH_TESTS__" + json.dumps(cases))

_rh_run_tests()
`;

export const PYTHON_RESULT_PREFIX = '__RH_TESTS__';

export const parsePythonReport = (stdout: string, ms: number): TestReport => {
  const line = stdout.split('\n').reverse().find(l => l.includes(PYTHON_RESULT_PREFIX));
  if (!line) return { ...emptyReport('python'), ms };
  try {
    const cases = JSON.parse(line.slice(line.indexOf(PYTHON_RESULT_PREFIX) + PYTHON_RESULT_PREFIX.length)) as TestCase[];
    const passed = cases.filter(c => c.ok).length;
    return { lang: 'python', cases, total: cases.length, passed, failed: cases.length - passed, missing: cases.length === 0, ms };
  } catch (e) {
    return { ...emptyReport('python', e instanceof Error ? e.message : String(e)), ms };
  }
};

/* -------------------------------------------------------------------- HTML */

const HTML_SHIM = `<script>(function(){
  var queued = [];
  window.RH = window.RH || {};
  window.RH.test = function (name, fn) { queued.push([String(name), fn]); };
  window.RH.__queued = queued;
  window.RH.assert = function (cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); };
  window.RH.assertEqual = function (a, b, msg) {
    var x = JSON.stringify(a), y = JSON.stringify(b);
    if (x !== y) throw new Error((msg ? msg + ' — ' : '') + 'expected ' + y + ', got ' + x);
  };
})();</script>`;

const HTML_RUNNER = `<script>(function(){
  var run = async function () {
    var queued = (window.RH && window.RH.__queued) || [];
    var cases = [];
    for (var i = 0; i < queued.length; i++) {
      var name = queued[i][0], fn = queued[i][1], t0 = performance.now();
      try {
        await fn();
        cases.push({ name: name, ok: true, ms: Math.round(performance.now() - t0) });
      } catch (e) {
        cases.push({ name: name, ok: false, ms: Math.round(performance.now() - t0), message: String((e && e.message) || e).slice(0, 400) });
      }
    }
    parent.postMessage({ __rhTests: cases }, '*');
  };
  var kick = function () { setTimeout(function () { run().catch(function (e) { parent.postMessage({ __rhTestsError: String(e) }, '*'); }); }, 80); };
  if (document.readyState === 'complete') kick();
  else window.addEventListener('load', kick);
  window.addEventListener('error', function (e) { parent.postMessage({ __rhTestsError: String((e && e.message) || 'runtime error') }, '*'); });
})();</script>`;

/** Inject the RH test shim + runner into an artifact document. */
export const instrumentHtml = (code: string): string => {
  let out = code;
  out = /<head[^>]*>/i.test(out)
    ? out.replace(/<head[^>]*>/i, m => m + '\n' + HTML_SHIM)
    : HTML_SHIM + '\n' + out;
  out = /<\/body>/i.test(out)
    ? out.replace(/<\/body>/i, HTML_RUNNER + '\n</body>')
    : out + '\n' + HTML_RUNNER;
  return out;
};

/** Run an HTML artifact's suite inside a throwaway sandboxed iframe. */
export const runHtmlTests = (code: string, timeoutMs = 12000): Promise<TestReport> =>
  new Promise(resolve => {
    const started = Date.now();
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:768px;opacity:0;pointer-events:none';

    let settled = false;
    const finish = (report: TestReport) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      frame.remove();
      resolve({ ...report, ms: Date.now() - started });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data.__rhTests)) {
        const cases = data.__rhTests as TestCase[];
        const passed = cases.filter(c => c.ok).length;
        finish({
          lang: 'html', cases, total: cases.length, passed,
          failed: cases.length - passed, missing: cases.length === 0, ms: 0,
        });
      } else if (data.__rhTestsError) {
        finish(emptyReport('html', String(data.__rhTestsError)));
      }
    };

    const timer = setTimeout(
      () => finish(emptyReport('html', 'test run timed out — the page never finished loading or a test hung')),
      timeoutMs,
    );

    window.addEventListener('message', onMessage);
    frame.srcdoc = instrumentHtml(code);
    document.body.appendChild(frame);
  });
