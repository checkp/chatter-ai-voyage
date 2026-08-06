// Build mode — agents collaboratively iterate on a single-file artifact.
// The artifact lives in the message stream (platform = ARTIFACT_PLATFORM), so it
// gets persistence, RLS and free version history for nothing.

export const ARTIFACT_PLATFORM = 'artifact_panel';

export type ArtifactLang = 'html' | 'python';

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
      <p>Describe the app you want and the agents will start building.</p>
    </main>
  </body>
</html>`;

export const STARTER_PYTHON = `# Nothing built yet — describe what you want and the agents will start writing Python.
# This runs real CPython in your browser via Pyodide. numpy, pandas, matplotlib,
# scipy, scikit-learn and friends are available.

print("Hello from CPython in the browser")
`;

export const starterCode = (lang: ArtifactLang) =>
  lang === 'python' ? STARTER_PYTHON : STARTER_HTML;

const HTML_RULES = `1. Reply with a COMPLETE, standalone HTML document inside a single \`\`\`html fenced code block. No partial diffs, no placeholders, no "rest unchanged" comments.
2. Everything inline: CSS in <style>, JS in <script>. No build step, no local files. External CDN scripts are allowed but keep them minimal.
3. It must run correctly when dropped into an iframe with no network guarantees. No server calls, no API keys.
4. Preserve everything that already works. Apply only the change the human (or the previous agent) asked for, plus obvious fixes.
5. Before the code block, write at most 2 short sentences describing what you changed. Nothing after the code block.
6. Keep it small, polished and accessible. Sensible colours, keyboard support, mobile-friendly.`;

const PYTHON_RULES = `1. Reply with a COMPLETE, runnable Python script inside a single \`\`\`python fenced code block. No partial diffs, no placeholders, no "rest unchanged" comments.
2. The script runs as CPython 3 inside Pyodide in the browser (WebAssembly). It must run top-to-bottom with no arguments and no user input (\`input()\` is unavailable).
3. Available out of the box: the standard library plus numpy, pandas, matplotlib, scipy, scikit-learn, sympy, networkx, pillow and other Pyodide-bundled wheels. NO network access, NO file system beyond a temporary in-memory one, no subprocess, no threads, no tkinter/pygame.
4. Show results with \`print(...)\`. For charts use matplotlib and simply create the figures — do NOT call \`plt.show()\` or \`savefig\`; the panel captures every open figure automatically and renders it.
5. Preserve everything that already works. Apply only the change the human (or the previous agent) asked for, plus obvious fixes. Keep the script self-contained, readable and commented where it earns it.
6. Before the code block, write at most 2 short sentences describing what you changed. Nothing after the code block.`;

/** Instruction block prepended to every build-mode request. */
export const buildInstructions = (
  agentName: string,
  currentCode: string | null,
  lang: ArtifactLang = 'html',
) => `You are ${agentName}, working with other AI agents and a human inside RoboHeard "Build" mode. Together you iterate on ONE small self-contained ${lang === 'python' ? 'Python program' : 'web app'}.

Hard rules:
${lang === 'python' ? PYTHON_RULES : HTML_RULES}

${currentCode
  ? `Current version (iterate on THIS exact ${lang === 'python' ? 'script' : 'document'}):\n\`\`\`${lang}\n${currentCode}\n\`\`\``
  : `There is nothing yet — create the first version from the human's request.`}`;

const fenceFor = (reply: string, langs: string[]) => {
  const re = new RegExp('```(?:' + langs.join('|') + ')\\s*\\n([\\s\\S]*?)```', 'i');
  return reply.match(re)?.[1]?.trim() ?? null;
};

/** Pull the artifact + the agent's short note out of a model reply. */
export const extractArtifact = (
  reply: string,
  preferred: ArtifactLang = 'html',
): { code: string | null; lang: ArtifactLang; notes: string } => {
  const pythonBlock = fenceFor(reply, ['python', 'py']);
  const htmlBlock = fenceFor(reply, ['html']);

  let lang: ArtifactLang = preferred;
  let code: string | null = null;

  if (preferred === 'python') {
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
