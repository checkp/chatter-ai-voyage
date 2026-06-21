# RoboHeard

> Agentic AI orchestration. Eight frontier models in one calm workspace — Conductor delegates, Discussion debates, Side-by-Side compares, Image Studio fans out.

**Live:** [roboheard.ai](https://roboheard.ai) · [What's New](https://roboheard.ai/whats-new) · [Features](https://roboheard.ai/features)

---

## Keeping docs in sync

`src/data/changelog.ts` and `src/data/features.ts` are the source of truth. After every meaningful release run:

```sh
node scripts/sync-docs.mjs
```

This regenerates the auto-blocks below **and** `public/llms.txt` **and** bumps `<lastmod>` in `public/sitemap.xml`. The `/whats-new` and `/features` pages read directly from the TS files, so they update automatically.

---

## Features

<!-- AUTO:FEATURES:START -->
<!-- AUTO:FEATURES:END -->

---

## Changelog

<!-- AUTO:CHANGELOG:START -->
<!-- AUTO:CHANGELOG:END -->

---

## Tech

Vite · React 18 · TypeScript · Tailwind · shadcn-ui · Lovable Cloud (Supabase) · Lovable AI Gateway.

## Develop

```sh
npm i
npm run dev
```
