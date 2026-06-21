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
### Eight Frontier Models

Every flagship LLM, in one calm workspace — pick one, compare a few, or run all eight in parallel.

- **OpenAI GPT-5** — Latest reasoning model from OpenAI, including GPT-5 and GPT-4o variants.
- **Anthropic Claude 4** — Claude Opus 4 and Sonnet 4 — long-form analysis, careful writing, structured thinking.
- **Google Gemini 2.5** — Gemini 2.5 Pro and Flash with million-token context for long documents.
- **xAI Grok-4** — Grok 4 and Grok 4 Fast — sharp, current, opinionated.
- **DeepSeek R2** — Open-source reasoning depth at a fraction of the cost.
- **Mistral Large** — Mistral Large, Medium, Small and Codestral for multilingual and coding work.
- **Perplexity Sonar** — Sonar Pro and Sonar Reasoning Pro with live web search and source citations.
- **Alibaba Qwen** — Qwen Max, Plus, Turbo and Qwen3-Max via DashScope — strong multilingual reasoning.

### Four Chat Modes

Match the interaction pattern to your task — collaboration, comparison, or solo focus.

- **Conductor Mode** — A meta-agent plans the work, delegates to specialists, mediates disagreements, and returns a synthesised answer.
- **Discussion Mode** — All enabled agents see each other's messages and build on one another — a roundtable conversation.
- **Isolated Mode** — Each agent answers independently. Ideal for honest, unbiased comparison of replies.
- **Side-by-Side Mode** — Dedicated columns per agent for quick visual scanning of parallel responses.

### Agentic Orchestration

Beyond chat — the Conductor turns eight models into one coordinated system.

- **Task Delegation** — Conductor analyses your query and routes sub-tasks to the best-suited specialists.
- **Cross-Model Reasoning** — Combines distinct lenses — analytical, creative, multilingual, real-time — into a single answer.
- **Conflict Resolution** — When models disagree, the Conductor surfaces consensus, dissent, and the evidence behind each.
- **Live Synthesis** — Structured conclusions, action items, and minority viewpoints generated as agents respond.
- **Free Mode** — Multi-round autonomous debates between agents — emergent reasoning, hands-off.

### Market & Web Research

Grounded answers with citations — not confident guesses.

- **Live Web Search** — Perplexity Sonar pulls fresh sources in real time and includes inline citations.
- **Long-Document Analysis** — Gemini 2.5's million-token context reads entire reports, papers, and transcripts at once.
- **Cross-Model Fact Checking** — Other agents review Perplexity's claims so you don't take a single source on trust.
- **Sourced Briefs** — Conductor returns balanced, link-backed summaries instead of opinion.

### Multi-Model Image Studio

One brief, several visual minds. Render once, pick the result that fits.

- **7 Image Models in Parallel** — DALL·E 3, GPT-Image-1, Gemini 2.5 Flash, Gemini 3 Pro, Grok Aurora, Qwen Wanx, Pollinations FLUX.
- **Conductor Image Synthesis** — Eight chat agents propose visual angles, the Conductor merges them into one master prompt before rendering.
- **Pollinations FLUX** — Open-source FLUX renderer included at just 10t per image.
- **Tiny Cost Preview** — Live credit estimate appears under the prompt — no popup pickers interrupting flow.
- **Resilient Gateway** — Auto-fallback to direct providers when the Lovable Gateway returns 402/429/5xx.

### Workspace & Controls

Small details that make multi-agent work feel calm instead of chaotic.

- **Per-Agent Settings** — Pick model variant and write custom instructions per agent — auto-saved, no save button.
- **Reorderable Agent Bar** — Drag agents into your preferred order; layout persists.
- **Activity Console** — Floating console shows live agent status, token use, and errors as they happen.
- **Auto-Renamed Chats** — New conversations are titled from your first message automatically.
- **Mobile Interface** — Dedicated mobile layout with auto-hiding header and bottom action button.
- **Guided Tour** — Step-by-step walkthrough of every mode, the Conductor, and Free Mode.
- **Light & Dark Themes** — Multiple themes including dark and high-contrast options.

### Account & Billing

Transparent pricing, flexible access, no surprises.

- **Token Balance** — Live balance in the header; per-message cost estimate before you send.
- **Token Packages** — Buy credits via LemonSqueezy — pay only for what you actually run.
- **Free Daily Conversations** — Free demo chat on the landing page; no signup required to try.
- **Transaction History** — Full record of token purchases and per-agent spend.

### Security & Reliability

Production posture: strict RLS, encrypted secrets, retried calls.

- **Row-Level Security** — Strict RLS on every table; user_id is derived from the JWT, never the request body.
- **Encrypted API Keys** — BYO provider keys are encrypted at rest and only decrypted server-side.
- **Private Image Storage** — Generated images live in a private bucket with owner-scoped policies and auto-refreshing signed URLs.
- **Retried AI Calls** — All AI API calls retry up to 3× with exponential backoff and fresh auth on each attempt.
<!-- AUTO:FEATURES:END -->

---

## Changelog

<!-- AUTO:CHANGELOG:START -->
### v2.8.0 — Fun Mode: Chats That Restyle Themselves  
_2026-06-10_

Toggle Fun mode and the chat window evolves its look after each reply — backgrounds, bubbles, accents, and fonts gradually drift to match the conversation's vibe. Readability is always guarded.

- _feature_ — 🎨 Fun mode toggle in the chat header — chat surface restyles itself after each AI round
- _feature_ — 🌈 Themes evolve subtly: hues, bubble shapes, accents, and curated fonts shift round-by-round
- _improvement_ — 🔍 WCAG contrast guard auto-snaps bubble text to readable black/white if needed
- _improvement_ — 💾 Per-chat fun-mode state remembered locally; capped at 40 evolutions to keep costs sane

### v2.7.0 — Shared Memory Across Chats  
_2026-06-10_

Every message is now embedded and recalled across chats, giving each agent persistent context and a lightweight long-term memory.

- _feature_ — 🧠 Cross-chat shared context: relevant snippets from past conversations are auto-injected into new prompts
- _feature_ — 📌 Per-user memory: key facts are distilled after each response and reused as system context
- _improvement_ — 🔒 Hardened edge functions: removed dead BYO-key endpoints and rate-limited the chat-title generator
- _improvement_ — 🏷️ Version badge added to the chat sidebar — click to open What's New

### v2.6.1 — Pollinations FLUX Joins the Image Studio  
_2026-06-09_

A 7th image generator powered by open-source FLUX — fast, low-cost, and always on.

- _feature_ — 🌻 Pollinations FLUX: Open-source FLUX image model added as the 7th parallel renderer (just 10t per image)
- _improvement_ — ✅ Enabled by default alongside the other 6 image models

### v2.6.0 — Multi-Agent Image Studio & 6 Image Models  
_2026-06-09_

Image generation is now a true multi-agent collaboration: 8 agents propose, the Conductor merges, and 6 image models render in parallel.

- _feature_ — 🎨 6 Image Models by Default: DALL·E 3, GPT-Image-1, Gemini 2.5 Flash, Gemini 3 Pro, Grok Aurora, and Qwen Wanx all fire in parallel
- _feature_ — 🐉 Qwen Image (Wanx): Alibaba DashScope wanx2.1-t2i-turbo with vivid Eastern aesthetic
- _feature_ — ⚡ Grok Aurora: xAI's bold, playful image model added to the rotation
- _feature_ — 🎼 Conductor Image Synthesis: 8 agents propose visual angles, Conductor merges into one master prompt before rendering
- _improvement_ — 💸 Tiny Cost Preview: 8pt credit estimate appears under image prompts — no more popup picker interruption
- _improvement_ — 🛡️ Resilient Gateway: Auto-fallback to direct OpenAI when Lovable Gateway returns 402/429/5xx
- _bugfix_ — 🔧 DALL·E 3 Fixed: Dropped deprecated response_format param that was returning 400 errors

### v2.5.0 — Qwen Joins as the 8th Agent  
_2026-06-08_

Alibaba's Qwen is now a full first-class agent across chat, conductor, and image generation.

- _feature_ — 🐉 Qwen Agent: qwen-max, qwen-plus, qwen-turbo, and qwen3-max via DashScope International
- _feature_ — 🎭 8 Frontier Providers: OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Perplexity, and Qwen
- _improvement_ — 🌸 Soft Rose Agent Color: New theme token for Qwen across the UI
- _improvement_ — 💰 Pricing Sync: Qwen pricing wired into admin model pricing sync

### v2.4.0 — Mistral AI & Perplexity AI Integration  
_2026-04-11_

Added two new frontier AI providers — Mistral AI for multilingual reasoning and Perplexity AI for real-time web search with citations.

- _feature_ — 🌀 Mistral AI: Added Mistral Large, Medium, Small, and Codestral models with multilingual and coding capabilities
- _feature_ — 🔮 Perplexity AI: Added Sonar Pro, Sonar, and Sonar Reasoning Pro with live web search and automatic source citations
- _improvement_ — 🎯 7 Frontier Providers: Platform now orchestrates models from OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, and Perplexity
- _improvement_ — 🎨 New Agent Colors: Distinctive orange (Mistral) and teal (Perplexity) theme colors

### v2.3.0 — Interactive Guided Tour, Demo Chat & Mode-Aware Agents  
_2026-04-11_

New guided tour for the chat interface, live demo chat on the landing page, and smarter mode-aware agent prompts.

- _feature_ — 🧭 Guided Tour: Step-by-step tooltip tour walks you through every chat mode, conductor AI, free mode, and more
- _feature_ — 💬 Live Demo Chat: Try a real AI conversation on the landing page — no signup required
- _feature_ — 🎨 Side-by-Side Hero: Redesigned landing hero with demo chat and product info in a two-column layout
- _improvement_ — 🧠 Mode-Aware Prompts: Agents now understand their conversation context — discussion, conductor, or free mode
- _improvement_ — 📢 Auto What's New: Changelog dialog now pops up automatically when there are new updates since your last visit
- _improvement_ — 🚀 Auto-Launch Tour: The guided tour starts automatically for users who haven't seen it yet

### v2.2.0 — Agentic AI Refresh & Security Hardening  
_2026-04-08_

Major content refresh for the agentic AI era, security improvements, and conductor UX polish.

- _feature_ — 🌐 Landing Page Refresh: Updated all content to reflect 2026 frontier models (GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2)
- _feature_ — 🎼 Conductor Showcase: Redesigned hero and features to spotlight agentic multi-model orchestration
- _improvement_ — 🔒 Security Hardening: Migrated admin role checks to a dedicated user_roles table with security-definer functions
- _improvement_ — ⬇️ Auto-Scroll in Conductor: Both conductor and agent panes now auto-scroll to the latest message
- _improvement_ — 📏 Activity Console Resize: Floating activity log is now more compact to avoid overlapping the chat
- _bugfix_ — 🔧 Conductor Chat Context: Fixed issue where conductor mode created duplicate conversations instead of reusing the active one

### v2.1.13 — AI Model Updates & Deprecation Fixes  
_2026-04-05_

Fixed all broken AI agents by updating deprecated model IDs and API parameters across all platforms.

- _bugfix_ — 🔧 OpenAI: Replaced deprecated `max_tokens` with `max_completion_tokens` parameter
- _bugfix_ — 🔧 Claude: Updated from retired `claude-3-5-sonnet/haiku` to `claude-sonnet-4-20250514`
- _bugfix_ — 🔧 Grok: Fixed `max_tokens` → `max_completion_tokens` and added better error logging
- _bugfix_ — 🔧 Gemini: Updated to `gemini-2.5-flash` with legacy model fallback mapping
- _improvement_ — 📋 Updated all model configurations with current model IDs for all platforms
- _bugfix_ — 🗃️ Migrated all existing user agent settings to use valid model IDs

### v2.1.12 — Enhanced Conductor Mode with AI-Based Decision Making  
_2025-09-04_

Upgraded conductor mode with intelligent coordination decisions and improved agent orchestration.

- _feature_ — 🧠 AI-Powered Coordination: Conductor now intelligently decides when multi-agent coordination is needed
- _improvement_ — 🔒 Enhanced Privacy: User messages to conductor remain private and aren't forwarded to agents
- _improvement_ — 🎯 Optimized Agent Prompts: Conductor creates specialized prompts for agents instead of forwarding original messages
- _improvement_ — 💬 Two-Phase Response Flow: Conductor first analyzes, then coordinates only when beneficial
- _improvement_ — ⚡ Smarter Orchestration: Replaced keyword detection with AI-based decision making for better user experience
- _improvement_ — 🛡️ Improved Message Flow: Clear separation between conductor conversation and agent coordination
<!-- AUTO:CHANGELOG:END -->

---

## Tech

Vite · React 18 · TypeScript · Tailwind · shadcn-ui · Lovable Cloud (Supabase) · Lovable AI Gateway.

## Develop

```sh
npm i
npm run dev
```
