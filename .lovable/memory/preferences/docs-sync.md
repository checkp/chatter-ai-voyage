---
name: Docs sync
description: After any release or user-visible change, run scripts/sync-docs.mjs to regenerate README + llms.txt + sitemap lastmod
type: preference
---
**Rule:** After updating `src/data/changelog.ts` or `src/data/features.ts` — or shipping any user-visible feature — run:

```sh
node scripts/sync-docs.mjs
```

**Why:** `/whats-new`, `/features`, `public/sitemap.xml`, `public/llms.txt`, and `README.md` must always reflect the latest release. The user has repeatedly flagged forgotten updates.

**How to apply:**
1. Edit `src/data/changelog.ts` (prepend new entry) and `src/data/features.ts` (add to relevant category) — these are the source of truth.
2. Run `node scripts/sync-docs.mjs` — regenerates README auto-blocks, rewrites `public/llms.txt`, bumps every `<lastmod>` in `public/sitemap.xml` to today.
3. Never hand-edit the `<!-- AUTO:* -->` blocks in README.md or `public/llms.txt`; they get overwritten.
