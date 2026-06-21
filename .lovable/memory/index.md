# Project Memory

## Core
- Strict Security: Enforce RLS on all tables. DB functions must use `search_path`. Edge functions derive `user_id` purely from JWT, never body.
- AI Resilience: All AI API calls require 3 retries, exponential backoff, and a fresh auth refresh before execution.
- AI Behavior: Default to concise, direct responses (<150 words). No preambles or filler text.
- UI UX: Agent settings auto-save (no save button). Toasts are bottom-left, minimal, 3s duration.
- Brand: Position as 2026-era Agentic AI orchestrator utilizing 8 frontier models (OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Perplexity, Qwen).
- Docs Sync: After any user-visible change or release, update `src/data/changelog.ts` + `src/data/features.ts` then run `node scripts/sync-docs.mjs` (regenerates README, llms.txt, sitemap lastmod). Never hand-edit `<!-- AUTO:* -->` blocks.

## Memories
- [Conductor AI](mem://features/conductor) — Orchestration logic, context persistence, UI isolation, and DB schema mapping
- [Interactive Demo](mem://features/interactive-demo) — Landing page multi-AI unauthenticated chat, rate limits, localStorage migration
- [AI Providers](mem://technical/ai-providers) — Support for 7 providers, token limits, and Perplexity citation/alternation rules
- [Image Generation](mem://features/image-generation) — Routing for DALL-E, Gemini, and Grok via `generate-image` edge function
- [AI Mode Awareness](mem://technical/ai-behavior) — System prompt adjustments for Conductor, Discussion, and Free modes
- [Storage Security](mem://technical/storage-security) — Private buckets, owner-scoped RLS, and auto-refreshing signed URLs for images
- [User Engagement](mem://features/user-engagement) — LocalStorage-driven guided tours and auto-showing changelogs on version bumps
- [Pricing Sync](mem://admin/pricing-sync) — `sync-model-pricing` edge function logic for administrative cost management
- [Branding & SEO](mem://marketing/branding-seo) — JSON-LD structured data specs and Google Ads tracking configuration
- [Feature Inventory](mem://features/feature-inventory) — /features page powered by src/data/features.ts; keep in sync with changelog on each release
- [Docs Sync](mem://preferences/docs-sync) — Always run scripts/sync-docs.mjs after updating changelog/features data
