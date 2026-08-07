---
name: Build mode compound engineering
description: Build mode pipeline roles, TDD harness contract for Python/HTML artifacts, and proof-of-work reporting
type: feature
---

## Compound engineering pipeline (v2.14.0)
- Build mode runs stages: `plan` (Orchestrator — criteria/work items/risks, no code) → `implement` (each relay agent) → `test` (QA hardens suite) → `review` (gate, up to 2 repair rounds while red). `rigor` selector: `compound` (full) vs `fast` (implement only).
- Role prompts live in `src/config/buildMode.ts` (`buildInstructions({agentName, role, lang, currentCode, plan, harness})`).

## TDD harness (`src/lib/buildHarness.ts`)
- Python: agents write module-level `test_*` functions; `PYTHON_HARNESS` runs them in the same Pyodide interpreter and prints `__RH_TESTS__<json>`, parsed from run stdout (`PyodideRunner.run` returns `stdout`).
- HTML: agents register `RH.test(name, fn)`; `instrumentHtml` injects a shim (`RH.assert`, `RH.assertEqual`) in `<head>` and a runner before `</body>`, executed in a throwaway sandboxed iframe that postMessages results.
- Harness ownership: `ArtifactPanel` owns the sandbox and exposes `verify` upward via `registerVerify`; `BuildLayout` passes it into `useBuildMode`, so agents are judged by real runs.
- Proof of work: per-test report posted into the transcript and stored in the artifact payload (`{code, lang, author, role, tests}`); shown in the panel's Tests tab + header badge.
- Never let agents weaken assertions or delete failing tests to go green — prompts forbid it.
