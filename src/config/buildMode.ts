// Build mode — agents collaboratively iterate on a single-file web app artifact.
// The artifact lives in the message stream (platform = ARTIFACT_PLATFORM), so it
// gets persistence, RLS and free version history for nothing.

export const ARTIFACT_PLATFORM = 'artifact_panel';

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

/** Instruction block prepended to every build-mode request. */
export const buildInstructions = (agentName: string, currentHtml: string | null) => `You are ${agentName}, working with other AI agents and a human inside RoboHeard "Build" mode. Together you iterate on ONE small self-contained web app.

Hard rules:
1. Reply with a COMPLETE, standalone HTML document inside a single \`\`\`html fenced code block. No partial diffs, no placeholders, no "rest unchanged" comments.
2. Everything inline: CSS in <style>, JS in <script>. No build step, no local files. External CDN scripts are allowed but keep them minimal.
3. It must run correctly when dropped into an iframe with no network guarantees. No server calls, no API keys.
4. Preserve everything that already works. Apply only the change the human (or the previous agent) asked for, plus obvious fixes.
5. Before the code block, write at most 2 short sentences describing what you changed. Nothing after the code block.
6. Keep it small, polished and accessible. Sensible colours, keyboard support, mobile-friendly.

${currentHtml
  ? `Current version of the app (iterate on THIS exact document):\n\`\`\`html\n${currentHtml}\n\`\`\``
  : 'There is no app yet — create the first version from the human\'s request.'}`;

/** Pull the HTML document + the agent's short note out of a model reply. */
export const extractArtifact = (reply: string): { html: string | null; notes: string } => {
  const fenced = reply.match(/```(?:html|HTML)?\s*\n([\s\S]*?)```/);
  let html = fenced?.[1]?.trim() ?? null;

  if (!html) {
    // Some models skip the fence entirely.
    const raw = reply.match(/<!doctype html[\s\S]*<\/html>|<html[\s\S]*<\/html>/i);
    html = raw?.[0]?.trim() ?? null;
  }

  if (html && !/<html[\s>]/i.test(html)) {
    // Fragment only — wrap it so the preview still works.
    html = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>\n<body>\n${html}\n</body>\n</html>`;
  }

  const notes = reply
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!doctype html[\s\S]*<\/html>/i, '')
    .trim();

  return { html, notes };
};
