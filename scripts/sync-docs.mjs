#!/usr/bin/env node
/**
 * sync-docs.mjs — Single command to keep public-facing docs aligned.
 *
 * Source of truth:
 *   - src/data/changelog.ts  → What's New / version history
 *   - src/data/features.ts   → Features inventory
 *
 * Regenerates:
 *   - README.md              (between <!-- AUTO:... --> markers)
 *   - public/llms.txt        (entirely)
 *   - public/sitemap.xml     (bumps <lastmod> on every <url>)
 *
 * Run after every meaningful release:  node scripts/sync-docs.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);

// --- Tiny TS-literal extractor (no tsc dependency) ---------------------------
// We eval the exported array literal after stripping the `export const ... =`
// prefix and the trailing semicolon. The files are plain data — no imports.
function loadDataArray(relPath, exportName) {
  const src = readFileSync(resolve(root, relPath), "utf8");
  const re = new RegExp(`export const ${exportName}[^=]*=\\s*(\\[[\\s\\S]*?\\]);`, "m");
  const match = src.match(re);
  if (!match) throw new Error(`Could not find export ${exportName} in ${relPath}`);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${match[1]});`)();
}

const changelog = loadDataArray("src/data/changelog.ts", "changelog");
const featureCategories = loadDataArray("src/data/features.ts", "featureCategories");

const latest = changelog[0];

// --- README.md ---------------------------------------------------------------
const readmePath = resolve(root, "README.md");
const readme = readFileSync(readmePath, "utf8");

function renderFeaturesMd() {
  return featureCategories
    .map(
      (cat) =>
        `### ${cat.name}\n\n${cat.blurb}\n\n` +
        cat.features.map((f) => `- **${f.title}** — ${f.description}`).join("\n"),
    )
    .join("\n\n");
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const TYPE_BADGE = { feature: "✨ Feature", improvement: "🔧 Improvement", bugfix: "🐛 Fix", fix: "🐛 Fix" };

function renderChangelogMd() {
  // Group by YYYY-MM, keep changelog order (newest first).
  const groups = [];
  const byMonth = new Map();
  for (const e of changelog) {
    const key = e.date.slice(0, 7);
    if (!byMonth.has(key)) {
      const arr = [];
      byMonth.set(key, arr);
      groups.push({ key, entries: arr });
    }
    byMonth.get(key).push(e);
  }

  const formatDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
  };

  const monthTitle = (key) => {
    const [y, m] = key.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  return groups
    .map((g) => {
      const entries = g.entries
        .map((e) => {
          const top = TYPE_BADGE[e.type] ?? "✨ Feature";
          const bullets = e.changes
            .map((c) => `  - ${TYPE_BADGE[c.type] ?? "•"} ${c.description}`)
            .join("\n");
          return (
            `<details${g === groups[0] && e === g.entries[0] ? " open" : ""}>\n` +
            `<summary><strong>v${e.version}</strong> · ${e.title} <sub>${formatDate(e.date)} · ${top}</sub></summary>\n\n` +
            `> ${e.description}\n\n${bullets}\n\n</details>`
          );
        })
        .join("\n\n");
      return `### ${monthTitle(g.key)}\n\n${entries}`;
    })
    .join("\n\n---\n\n");
}

function replaceBlock(text, name, body) {
  const re = new RegExp(
    `(<!-- AUTO:${name}:START -->)[\\s\\S]*?(<!-- AUTO:${name}:END -->)`,
    "m",
  );
  const block = `$1\n${body}\n$2`;
  if (re.test(text)) return text.replace(re, block);
  // Append section if markers missing.
  return (
    text.trimEnd() +
    `\n\n## ${name}\n\n<!-- AUTO:${name}:START -->\n${body}\n<!-- AUTO:${name}:END -->\n`
  );
}

let nextReadme = readme;
nextReadme = replaceBlock(nextReadme, "FEATURES", renderFeaturesMd());
nextReadme = replaceBlock(nextReadme, "CHANGELOG", renderChangelogMd());
writeFileSync(readmePath, nextReadme);

// --- public/llms.txt ---------------------------------------------------------
const llms = `# RoboHeard

> Agentic AI orchestration platform. Conductor Mode delegates, debates, and synthesizes responses across GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, Mistral Large, Perplexity Sonar, and Qwen in real time.

RoboHeard lets you chat with eight frontier AI models at once, orchestrate them with a Conductor agent that plans and delegates work, or compare answers side-by-side. Free Mode runs autonomous multi-agent debates; the Image Studio fans a single prompt across DALL·E, Gemini, Grok, Qwen Wanx, and Pollinations FLUX.

## Pages

- [Home](/): Multi-agent chat workspace with Conductor, Discussion, Isolated, and Side-by-Side modes.
- [Features](/features): Full inventory of every capability across models, modes, image studio, research, workspace, billing, and security.
- [What's new](/whats-new): Complete release history and changelog.
- [Landing](/landing): Product overview, features, and AI model lineup.
- [Help](/help): Getting started guide, mode explanations, and starter prompts.
- [Purchase](/purchase): Token packages for accessing the AI models.
- [Images](/images): Multi-provider image generation interface.

## Latest release

- v${latest.version} (${latest.date}) — ${latest.title}: ${latest.description}

## Feature categories

${featureCategories.map((c) => `- ${c.name}: ${c.blurb}`).join("\n")}
`;
writeFileSync(resolve(root, "public/llms.txt"), llms);

// --- public/sitemap.xml: bump every <lastmod> -------------------------------
const sitemapPath = resolve(root, "public/sitemap.xml");
const sitemap = readFileSync(sitemapPath, "utf8").replace(
  /<lastmod>[^<]+<\/lastmod>/g,
  `<lastmod>${today}</lastmod>`,
);
writeFileSync(sitemapPath, sitemap);

console.log(`✓ sync-docs: README.md, public/llms.txt, public/sitemap.xml (lastmod ${today})`);
console.log(`  latest release: v${latest.version} — ${latest.title}`);
