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
### Eight Frontier Models — Plus Yours

Every flagship LLM, in one calm workspace — pick one, compare a few, run all eight in parallel, or bring your own local model.

- **OpenAI GPT-5** — Latest reasoning model from OpenAI, including GPT-5 and GPT-4o variants.
- **Anthropic Claude 4** — Claude Opus 4 and Sonnet 4 — long-form analysis, careful writing, structured thinking.
- **Google Gemini 2.5** — Gemini 2.5 Pro and Flash with million-token context for long documents.
- **xAI Grok-4** — Grok 4 and Grok 4 Fast — sharp, current, opinionated.
- **DeepSeek R2** — Open-source reasoning depth at a fraction of the cost.
- **Mistral Large** — Mistral Large, Medium, Small and Codestral for multilingual and coding work.
- **Perplexity Sonar** — Sonar Pro and Sonar Reasoning Pro with live web search and source citations.
- **Alibaba Qwen** — Qwen Max, Plus, Turbo and Qwen3-Max via DashScope — strong multilingual reasoning.
- **Local Models** — Add any model running in LM Studio or Ollama as a Local agent — private, offline-capable, and a flat 1 token per message.

### Five Chat Modes

Match the interaction pattern to your task — collaboration, comparison, solo focus, or building.

- **Conductor Mode** — A meta-agent plans the work, delegates to specialists, mediates disagreements, and returns a synthesised answer.
- **Discussion Mode** — All enabled agents see each other's messages and build on one another — a roundtable conversation.
- **Isolated Mode** — Each agent answers independently. Ideal for honest, unbiased comparison of replies.
- **Side-by-Side Mode** — Dedicated columns per agent for quick visual scanning of parallel responses.
- **Build Mode** — Split chat and live artifact: you and the agents iterate on one self-contained web app or Python script. The panel splits into the running artifact plus a code browser and console, with instant preview, version history, hand editing, and download.
- **Python Sandbox** — Build mode runs real CPython in your browser via Pyodide — numpy, pandas, matplotlib, scipy and scikit-learn included, matplotlib figures rendered inline, and an interactive console that shares the session with the script.

### Agentic Orchestration

Beyond chat — the Conductor turns eight models into one coordinated system.

- **Task Delegation** — Conductor analyses your query and routes sub-tasks to the best-suited specialists.
- **Cross-Model Reasoning** — Combines distinct lenses — analytical, creative, multilingual, real-time — into a single answer.
- **Conflict Resolution** — When models disagree, the Conductor surfaces consensus, dissent, and the evidence behind each.
- **Live Synthesis** — Structured conclusions, action items, and minority viewpoints generated as agents respond.
- **Free Mode** — Multi-round autonomous debates between agents — emergent reasoning, hands-off.

### Advanced AI Capabilities

Per-message superpowers — toggle in the composer or let the Conductor assign them per agent.

- **Think (Extended Reasoning)** — Higher reasoning budgets across OpenAI, Claude, Gemini, Grok, DeepSeek-Reasoner, and Sonar Reasoning Pro.
- **Search (Live Web)** — Provider-native web grounding — OpenAI web_search, Claude web_search, Gemini google_search, Grok search, always-on Perplexity.
- **Deep Research** — Auto-swap to flagship research tiers: gpt-5, opus-4, gemini-2.5-pro, grok-4-heavy, sonar-deep-research, qwen-max.
- **Code Execution** — Sandboxed code tools on OpenAI (code_interpreter), Claude (code_execution_20250522), and Gemini (code_execution).
- **Conductor-Assigned** — Conductor can emit per-agent capability hints — the right tools fire on the right specialist automatically.

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

### Device Integrations

Bring notes and files from your own hardware into the conversation.

- **reMarkable Tablet** — Pair your reMarkable with an 8-character one-time code, browse notebooks and folders, and fetch any notebook as a rendered PDF.
- **Handwriting → Text** — AI transcription turns handwritten notebook pages into clean markdown you can search, edit, and reuse.
- **Notes as Chat Context** — Drop any transcribed note straight into the composer so every agent can reason over your handwritten thinking.
- **Private Note Storage** — Fetched PDFs live in a private, owner-scoped bucket with signed, expiring links — never public.

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
### August 2026

<details open>
<summary><strong>v2.13.0</strong> · Python in Build Mode — Real CPython in Your Browser <sub>August 6, 2026 · ✨ Feature</sub></summary>

> Build mode now speaks Python as well as HTML. Pick Python as the target and the agents write a script that runs as real CPython in your browser through Pyodide, with numpy, pandas, matplotlib and friends. The artifact panel is now split in two: the running artifact on top, the code browser and an interactive console underneath.

  - ✨ Feature 🐍 Python target in build mode — agents write a self-contained script executed by Pyodide (CPython compiled to WebAssembly) inside a sandboxed worker, with no server round trip
  - ✨ Feature 📦 Batteries included — numpy, pandas, matplotlib, scipy, scikit-learn, sympy and other bundled wheels load automatically from the script's imports
  - ✨ Feature 📊 Charts render inline — every matplotlib figure the script leaves open is captured and shown in the artifact stage
  - ✨ Feature 🖥️ Split artifact panel — the artifact on top, code browser plus console below, both resizable
  - ✨ Feature ⌨️ Interactive console — a live Python prompt sharing the interpreter session with the script, with command history and streamed stdout/stderr
  - 🔧 Improvement 🔁 Scripts re-run automatically when a new revision lands, plus Run, stop and restart-interpreter controls

</details>

<details>
<summary><strong>v2.12.0</strong> · Build Mode — Chat Plus a Live App Artifact <sub>August 6, 2026 · ✨ Feature</sub></summary>

> A new split view where you and the agents build a small web app together. Left side is the conversation, right side is the running app. Every round rewrites the artifact, so you can watch it evolve, roll back, edit the code by hand, or download it.

  - ✨ Feature 🔨 Build mode — resizable split layout: chat on the left, live sandboxed preview of the app on the right
  - ✨ Feature 🔁 Relay building — every enabled agent takes a turn in order, each one iterating on the previous agent's version; or pick a single agent to do the work
  - ✨ Feature 🕓 Version history — each round is saved as a revision you can jump back to, with the author of every version
  - ✨ Feature ✏️ Code tab — edit the HTML by hand and save it as a new revision; download the app or open it in a new tab
  - 🔧 Improvement 📱 Mobile-width preview toggle and one-click reload for the artifact frame

</details>

<details>
<summary><strong>v2.11.0</strong> · reMarkable Tablet Integration <sub>August 6, 2026 · ✨ Feature</sub></summary>

> Pair your reMarkable tablet with a single one-time code, browse your notebooks and folders, pull any notebook down as a rendered PDF, transcribe the handwriting with AI, and send the result into a chat as context for every agent.

  - ✨ Feature 📱 reMarkable pairing — enter the 8-character code from my.remarkable.com/device/desktop/connect; the device token is stored server-side and session tokens refresh automatically
  - ✨ Feature 🗂️ Notebook sync — walks the reMarkable cloud sync tree and caches your document/folder list with names, parents, and modified times
  - ✨ Feature 📄 PDF fetch — exports any notebook (handwriting included) into a private owner-scoped bucket with signed, expiring links
  - ✨ Feature ✍️ Handwriting → text — Gemini 2.5 Flash transcribes notebook pages into clean markdown, stored per note
  - ✨ Feature 💬 Send to chat — push a transcribed note into the composer as context for all enabled agents
  - 🔧 Improvement ⚙️ New 'reMarkable' tab in Settings for pairing, syncing, searching notebooks, and disconnecting (which also wipes cached notes and PDFs)

</details>

---

### July 2026

<details>
<summary><strong>v2.10.0</strong> · Local Models & Self-Hosting <sub>July 4, 2026 · ✨ Feature</sub></summary>

> Run models on your own machine: a new Local agent connects to LM Studio or Ollama through a '+' menu in the agent bar — pick any local model, chat for a flat 1 token, keep everything on your hardware. Plus a full self-hosting path: containerized frontend and a reproducible self-hosted Supabase setup.

  - ✨ Feature 💻 Local agent — '+' button in the agent bar opens a menu of local providers (LM Studio, Ollama) and their installed models; pick one to add a Local agent
  - ✨ Feature 🔌 local-chat edge function — OpenAI-compatible proxy to local providers with server-side model discovery (no CORS hassles) and flat 1-token billing
  - ✨ Feature 🐳 Self-hosting support — production Dockerfile (nginx static serve) and env-configurable Supabase endpoint for self-hosted deployments
  - 🔧 Improvement 🖥️ Activity console returns as a compact icon (bottom-left, collapsed by default), repositioned clear of the version badge
  - 🐛 Fix 🔧 Disabled agents could still fire after a page refresh — agent settings now load session-gated with retries instead of silently falling back to all-enabled

</details>

---

### June 2026

<details>
<summary><strong>v2.9.0</strong> · Advanced AI Capabilities: Think, Search, Deep Research & Code <sub>June 21, 2026 · ✨ Feature</sub></summary>

> Per-message capability toggles unlock provider-native superpowers — extended reasoning, live web search, deep research, and code execution — across all 7 chat providers. Conductor can assign them per agent automatically.

  - ✨ Feature 🧠 Think — extended reasoning via OpenAI reasoning_effort, Claude thinking budget, Gemini thinkingConfig, Grok reasoning_effort, DeepSeek-Reasoner, Sonar Reasoning Pro
  - ✨ Feature 🌐 Search — live web grounding via OpenAI web_search, Claude web_search_20250305, Gemini google_search, Grok search_parameters, always-on Perplexity
  - ✨ Feature 🔭 Deep Research — model-swap to flagship research tiers (gpt-5, opus-4, gemini-2.5-pro, grok-4-heavy, sonar-deep-research, qwen-max)
  - ✨ Feature 💻 Code Execution — sandboxed code tools on OpenAI (code_interpreter), Claude (code_execution_20250522), and Gemini (code_execution)
  - ✨ Feature 🎼 Conductor-assigned capabilities — Conductor can emit [CAPABILITIES: agent=think,search] per delegated agent
  - 🔧 Improvement ⚙️ Per-agent capability defaults persisted in user_capability_defaults (RLS-scoped) and overridable per message in the composer

</details>

<details>
<summary><strong>v2.8.0</strong> · Fun Mode: Chats That Restyle Themselves <sub>June 10, 2026 · ✨ Feature</sub></summary>

> Toggle Fun mode and the chat window evolves its look after each reply — backgrounds, bubbles, accents, and fonts gradually drift to match the conversation's vibe. Readability is always guarded.

  - ✨ Feature 🎨 Fun mode toggle in the chat header — chat surface restyles itself after each AI round
  - ✨ Feature 🌈 Themes evolve subtly: hues, bubble shapes, accents, and curated fonts shift round-by-round
  - 🔧 Improvement 🔍 WCAG contrast guard auto-snaps bubble text to readable black/white if needed
  - 🔧 Improvement 💾 Per-chat fun-mode state remembered locally; capped at 40 evolutions to keep costs sane

</details>

<details>
<summary><strong>v2.7.0</strong> · Shared Memory Across Chats <sub>June 10, 2026 · ✨ Feature</sub></summary>

> Every message is now embedded and recalled across chats, giving each agent persistent context and a lightweight long-term memory.

  - ✨ Feature 🧠 Cross-chat shared context: relevant snippets from past conversations are auto-injected into new prompts
  - ✨ Feature 📌 Per-user memory: key facts are distilled after each response and reused as system context
  - 🔧 Improvement 🔒 Hardened edge functions: removed dead BYO-key endpoints and rate-limited the chat-title generator
  - 🔧 Improvement 🏷️ Version badge added to the chat sidebar — click to open What's New

</details>

<details>
<summary><strong>v2.6.1</strong> · Pollinations FLUX Joins the Image Studio <sub>June 9, 2026 · ✨ Feature</sub></summary>

> A 7th image generator powered by open-source FLUX — fast, low-cost, and always on.

  - ✨ Feature 🌻 Pollinations FLUX: Open-source FLUX image model added as the 7th parallel renderer (just 10t per image)
  - 🔧 Improvement ✅ Enabled by default alongside the other 6 image models

</details>

<details>
<summary><strong>v2.6.0</strong> · Multi-Agent Image Studio & 6 Image Models <sub>June 9, 2026 · ✨ Feature</sub></summary>

> Image generation is now a true multi-agent collaboration: 8 agents propose, the Conductor merges, and 6 image models render in parallel.

  - ✨ Feature 🎨 6 Image Models by Default: DALL·E 3, GPT-Image-1, Gemini 2.5 Flash, Gemini 3 Pro, Grok Aurora, and Qwen Wanx all fire in parallel
  - ✨ Feature 🐉 Qwen Image (Wanx): Alibaba DashScope wanx2.1-t2i-turbo with vivid Eastern aesthetic
  - ✨ Feature ⚡ Grok Aurora: xAI's bold, playful image model added to the rotation
  - ✨ Feature 🎼 Conductor Image Synthesis: 8 agents propose visual angles, Conductor merges into one master prompt before rendering
  - 🔧 Improvement 💸 Tiny Cost Preview: 8pt credit estimate appears under image prompts — no more popup picker interruption
  - 🔧 Improvement 🛡️ Resilient Gateway: Auto-fallback to direct OpenAI when Lovable Gateway returns 402/429/5xx
  - 🐛 Fix 🔧 DALL·E 3 Fixed: Dropped deprecated response_format param that was returning 400 errors

</details>

<details>
<summary><strong>v2.5.0</strong> · Qwen Joins as the 8th Agent <sub>June 8, 2026 · ✨ Feature</sub></summary>

> Alibaba's Qwen is now a full first-class agent across chat, conductor, and image generation.

  - ✨ Feature 🐉 Qwen Agent: qwen-max, qwen-plus, qwen-turbo, and qwen3-max via DashScope International
  - ✨ Feature 🎭 8 Frontier Providers: OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Perplexity, and Qwen
  - 🔧 Improvement 🌸 Soft Rose Agent Color: New theme token for Qwen across the UI
  - 🔧 Improvement 💰 Pricing Sync: Qwen pricing wired into admin model pricing sync

</details>

---

### April 2026

<details>
<summary><strong>v2.4.0</strong> · Mistral AI & Perplexity AI Integration <sub>April 11, 2026 · ✨ Feature</sub></summary>

> Added two new frontier AI providers — Mistral AI for multilingual reasoning and Perplexity AI for real-time web search with citations.

  - ✨ Feature 🌀 Mistral AI: Added Mistral Large, Medium, Small, and Codestral models with multilingual and coding capabilities
  - ✨ Feature 🔮 Perplexity AI: Added Sonar Pro, Sonar, and Sonar Reasoning Pro with live web search and automatic source citations
  - 🔧 Improvement 🎯 7 Frontier Providers: Platform now orchestrates models from OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, and Perplexity
  - 🔧 Improvement 🎨 New Agent Colors: Distinctive orange (Mistral) and teal (Perplexity) theme colors

</details>

<details>
<summary><strong>v2.3.0</strong> · Interactive Guided Tour, Demo Chat & Mode-Aware Agents <sub>April 11, 2026 · ✨ Feature</sub></summary>

> New guided tour for the chat interface, live demo chat on the landing page, and smarter mode-aware agent prompts.

  - ✨ Feature 🧭 Guided Tour: Step-by-step tooltip tour walks you through every chat mode, conductor AI, free mode, and more
  - ✨ Feature 💬 Live Demo Chat: Try a real AI conversation on the landing page — no signup required
  - ✨ Feature 🎨 Side-by-Side Hero: Redesigned landing hero with demo chat and product info in a two-column layout
  - 🔧 Improvement 🧠 Mode-Aware Prompts: Agents now understand their conversation context — discussion, conductor, or free mode
  - 🔧 Improvement 📢 Auto What's New: Changelog dialog now pops up automatically when there are new updates since your last visit
  - 🔧 Improvement 🚀 Auto-Launch Tour: The guided tour starts automatically for users who haven't seen it yet

</details>

<details>
<summary><strong>v2.2.0</strong> · Agentic AI Refresh & Security Hardening <sub>April 8, 2026 · ✨ Feature</sub></summary>

> Major content refresh for the agentic AI era, security improvements, and conductor UX polish.

  - ✨ Feature 🌐 Landing Page Refresh: Updated all content to reflect 2026 frontier models (GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2)
  - ✨ Feature 🎼 Conductor Showcase: Redesigned hero and features to spotlight agentic multi-model orchestration
  - 🔧 Improvement 🔒 Security Hardening: Migrated admin role checks to a dedicated user_roles table with security-definer functions
  - 🔧 Improvement ⬇️ Auto-Scroll in Conductor: Both conductor and agent panes now auto-scroll to the latest message
  - 🔧 Improvement 📏 Activity Console Resize: Floating activity log is now more compact to avoid overlapping the chat
  - 🐛 Fix 🔧 Conductor Chat Context: Fixed issue where conductor mode created duplicate conversations instead of reusing the active one

</details>

<details>
<summary><strong>v2.1.13</strong> · AI Model Updates & Deprecation Fixes <sub>April 5, 2026 · 🐛 Fix</sub></summary>

> Fixed all broken AI agents by updating deprecated model IDs and API parameters across all platforms.

  - 🐛 Fix 🔧 OpenAI: Replaced deprecated `max_tokens` with `max_completion_tokens` parameter
  - 🐛 Fix 🔧 Claude: Updated from retired `claude-3-5-sonnet/haiku` to `claude-sonnet-4-20250514`
  - 🐛 Fix 🔧 Grok: Fixed `max_tokens` → `max_completion_tokens` and added better error logging
  - 🐛 Fix 🔧 Gemini: Updated to `gemini-2.5-flash` with legacy model fallback mapping
  - 🔧 Improvement 📋 Updated all model configurations with current model IDs for all platforms
  - 🐛 Fix 🗃️ Migrated all existing user agent settings to use valid model IDs

</details>

---

### September 2025

<details>
<summary><strong>v2.1.12</strong> · Enhanced Conductor Mode with AI-Based Decision Making <sub>September 4, 2025 · ✨ Feature</sub></summary>

> Upgraded conductor mode with intelligent coordination decisions and improved agent orchestration.

  - ✨ Feature 🧠 AI-Powered Coordination: Conductor now intelligently decides when multi-agent coordination is needed
  - 🔧 Improvement 🔒 Enhanced Privacy: User messages to conductor remain private and aren't forwarded to agents
  - 🔧 Improvement 🎯 Optimized Agent Prompts: Conductor creates specialized prompts for agents instead of forwarding original messages
  - 🔧 Improvement 💬 Two-Phase Response Flow: Conductor first analyzes, then coordinates only when beneficial
  - 🔧 Improvement ⚡ Smarter Orchestration: Replaced keyword detection with AI-based decision making for better user experience
  - 🔧 Improvement 🛡️ Improved Message Flow: Clear separation between conductor conversation and agent coordination

</details>

---

### August 2025

<details>
<summary><strong>v2.1.11</strong> · Model pricing sync (admin) + pricing refresh <sub>August 8, 2025 · 🔧 Improvement</sub></summary>

> Added admin sync for model_pricing and refreshed provider-backed costs.

  - ✨ Feature One-click admin sync of model_pricing via edge function
  - 🔧 Improvement Updated pricing for OpenAI, Anthropic, Google, DeepSeek, xAI (provisional where noted)

</details>

<details>
<summary><strong>v2.1.10</strong> · ChatGPT 5 Model Support <sub>August 8, 2025 · ✨ Feature</sub></summary>

> Added ChatGPT 5 to OpenAI agent options with enhanced reasoning and vision.

  - ✨ Feature 🚀 New Model: ChatGPT 5 now available in OpenAI models list
  - 🔧 Improvement 🧠 Advanced Capabilities: Improved reasoning, coding, and multimodal support
  - 🔧 Improvement 🎛️ Model Selector: Updated descriptions and capabilities indicators

</details>

---

### January 2025

<details>
<summary><strong>v2.1.9</strong> · Mobile UI & Navigation Improvements <sub>January 29, 2025 · 🔧 Improvement</sub></summary>

> Enhanced mobile experience with responsive logos, clickable navigation, and improved spacing across all pages.

  - 🔧 Improvement 📱 Responsive Logo Design: Logos now scale properly on small screens across all pages
  - ✨ Feature 🔗 Clickable Logos: All logos are now clickable and navigate to home page with hover effects
  - 🔧 Improvement ✨ Mobile Typography: Better responsive text sizing on auth page and onboarding screens
  - 🔧 Improvement 📐 Enhanced Spacing: Improved padding and margins for better mobile layout
  - 🔧 Improvement 🎨 Visual Polish: Added hover transitions and opacity effects for better user feedback

</details>

<details>
<summary><strong>v2.1.4</strong> · Private Chat & Theme Improvements <sub>January 14, 2025 · 🔧 Improvement</sub></summary>

> Enhanced private agent chat functionality and improved dark theme with brownish color palette.

  - 🔧 Improvement 🎨 Brownish Night Theme: Updated amber-dark theme with warm brown tones for better visual comfort
  - 🐛 Fix 💬 Fixed Private Chat Windows: Resolved duplicate dialog windows appearing when clicking agent badges
  - 🔧 Improvement 📱 Better Dialog Layout: Improved private chat window formatting and text wrapping
  - 🔧 Improvement 🔧 Enhanced Dialog State Management: Better handling of dialog open/close states
  - 🔧 Improvement ✨ Improved Visual Hierarchy: Better contrast and readability in dark mode

</details>

<details>
<summary><strong>v2.1.3</strong> · Code Architecture Improvements <sub>January 13, 2025 · 🔧 Improvement</sub></summary>

> Major refactoring to improve code organization and maintainability with better component structure.

  - 🔧 Improvement 🔧 Refactored AIStatusBar: Split large component into smaller, focused components for better maintainability
  - 🔧 Improvement 🎨 CSS Architecture: Reorganized CSS into modular files (base, themes, components, agents) for better organization
  - 🔧 Improvement ⚡ Better Code Organization: Improved component structure and separation of concerns
  - 🔧 Improvement 🛠️ Enhanced Maintainability: Smaller, focused files make the codebase easier to navigate and modify
  - 🔧 Improvement 🧹 Code Cleanup: Removed unused code and optimized imports for better performance
  - 🐛 Fix 🎯 Fixed Theme Application: Resolved issues with theme switching and CSS variable application

</details>

<details>
<summary><strong>v2.1.2</strong> · UI Improvements & User Feedback <sub>January 12, 2025 · 🔧 Improvement</sub></summary>

> Enhanced user interface with better notification positioning and added contact functionality.

  - ✨ Feature 📧 Contact Us Button: Added convenient feedback button in bottom-left corner
  - ✨ Feature 💬 Feedback Dialog: Easy-to-use contact form for suggestions and issue reporting
  - 🔧 Improvement 🔔 Improved Toast Positioning: Notifications now appear higher to avoid covering controls
  - 🔧 Improvement 👁️ Better Drag Handle Visibility: Made draggable AI status bar handles much more visible
  - 🐛 Fix 🎯 Fixed LED Status Positioning: Status indicators no longer cover agent icons
  - 🔧 Improvement ✨ Enhanced Visual Feedback: Better contrast and positioning throughout the interface

</details>

<details>
<summary><strong>v2.1.1</strong> · Enhanced Side-by-Side Mode & Agent Controls <sub>January 12, 2025 · 🔧 Improvement</sub></summary>

> Major improvements to side-by-side chat mode with better agent management and responsive design.

  - 🔧 Improvement 🖥️ Enhanced Side-by-Side Layout: All enabled agents now display in one horizontal scrollable row
  - 🔧 Improvement 📜 Scrollable Agent Windows: Each agent window now has proper scrolling for message history
  - ✨ Feature 👁️ Individual Agent Toggle: Quick enable/disable buttons directly in each agent window
  - 🔧 Improvement 🎯 Improved Mode Selector: Chat mode selection moved to header for better accessibility
  - 🔧 Improvement 🔄 Better Agent Synchronization: Agent status updates consistently across all views
  - 🔧 Improvement 📱 Responsive Design: Side-by-side mode gracefully handles different screen sizes
  - 🐛 Fix 🐛 Fixed Runtime Errors: Resolved undefined message filtering in isolated mode
  - 🔧 Improvement ⚡ Performance Optimizations: Faster rendering of multiple agent windows

</details>

<details>
<summary><strong>v2.1.0</strong> · New Chat Modes: Isolated & Side-by-Side <sub>January 11, 2025 · ✨ Feature</sub></summary>

> Major update introducing three distinct chat interaction modes for different conversation styles.

  - ✨ Feature 🎯 Isolated Mode: Each AI agent only sees user messages and their own responses
  - ✨ Feature 📱 Side-by-Side Mode: Desktop-only view showing each agent in separate windows
  - ✨ Feature 💬 Discussion Mode: Original behavior where all agents can see each other's responses
  - 🔧 Improvement 🔄 Smart Mode Switching: Easy mode selection with automatic mobile fallback
  - 🔧 Improvement 🎨 Enhanced UI: Mode selector with clear descriptions and visual indicators
  - ✨ Feature 📊 Per-Agent Windows: Each agent gets dedicated space with response counters
  - ✨ Feature 🔒 Context Isolation: Agents in isolated modes receive filtered conversation history
  - 🔧 Improvement 💾 Mode Persistence: Chat mode settings are saved per conversation
  - 🔧 Improvement 📱 Mobile Optimized: Side-by-side mode gracefully falls back to isolated mode

</details>

<details>
<summary><strong>v2.0.3</strong> · Enhanced Multi-Agent Conversations <sub>January 10, 2025 · 🔧 Improvement</sub></summary>

> Improved conversation flow and agent interaction capabilities.

  - 🐛 Fix 🤖 Fixed agent context building to prevent self-referencing responses
  - 🔧 Improvement ⚡ Improved conversation history management for better context
  - 🔧 Improvement 🔄 Enhanced message threading and response coordination
  - 🔧 Improvement 📊 Better handling of concurrent agent responses
  - 🔧 Improvement 🎯 Optimized token usage across multiple agents

</details>

<details>
<summary><strong>v2.0.2</strong> · Mobile Interface Improvements <sub>January 9, 2025 · 🔧 Improvement</sub></summary>

> Enhanced mobile experience with better navigation and responsive design.

  - 🔧 Improvement 📱 Redesigned mobile header with improved agent status display
  - 🔧 Improvement 🎨 Better responsive layout for chat messages and input
  - 🔧 Improvement ⚡ Faster mobile chat loading and smoother scrolling
  - 🐛 Fix 🔧 Fixed mobile sidebar navigation issues
  - 🔧 Improvement 📊 Improved mobile settings panel organization

</details>

<details>
<summary><strong>v2.0.1</strong> · Performance & Reliability Updates <sub>January 8, 2025 · 🐛 Fix</sub></summary>

> Backend optimizations and bug fixes for improved stability.

  - 🔧 Improvement 🚀 Optimized database queries for faster chat loading
  - 🐛 Fix 🔧 Fixed token balance synchronization issues
  - 🔧 Improvement ⚡ Improved real-time message updates
  - 🔧 Improvement 🛡️ Enhanced error handling for API calls
  - 🔧 Improvement 📊 Better memory management for large conversations

</details>

<details>
<summary><strong>v2.0.0</strong> · RoboHeard 2.0 - Multi-Agent Platform <sub>January 7, 2025 · ✨ Feature</sub></summary>

> Complete redesign introducing multiple AI agents working together in collaborative conversations.

  - ✨ Feature 🤖 Multi-Agent Support: Chat with ChatGPT, Claude, DeepSeek, Grok, and Gemini simultaneously
  - ✨ Feature 💬 Collaborative Conversations: AI agents can see and build upon each other's responses
  - ✨ Feature 🎯 Smart Agent Management: Enable/disable specific agents and customize their models
  - ✨ Feature 🔄 Real-time Responses: All enabled agents respond concurrently to your messages
  - ✨ Feature 📊 Token System: Transparent token-based usage with daily free allowances
  - ✨ Feature 🎨 Agent Customization: Reorder agents and select specific models for each platform
  - ✨ Feature ⚡ Free Mode: Automated multi-round discussions between agents
  - ✨ Feature 🛡️ Secure API Integration: Centralized API key management with encryption
  - ✨ Feature 📱 Mobile Responsive: Full mobile support with touch-optimized interface
  - ✨ Feature 🎪 Enhanced UI: Modern dark theme with agent-specific color coding

</details>

---

### July 2025

<details>
<summary><strong>v2.1.8</strong> · Grok 4 Models & Agent Expansion <sub>July 15, 2025 · ✨ Feature</sub></summary>

> Added latest Grok 4 models and enhanced AI agent selection with new powerful options.

  - ✨ Feature 🚀 New Grok 4 Model: Added Grok 4 with advanced reasoning and real-time capabilities
  - ✨ Feature 💪 Grok 4 Heavy Model: Introduced most powerful Grok model for complex tasks and deep reasoning
  - 🔧 Improvement 🎯 Updated Default Model: Grok 4 is now the default selection for new users
  - 🔧 Improvement 🤖 Enhanced Model Selection: Better model descriptions and capability indicators
  - 🔧 Improvement ⚡ Performance Tiers: Clear cost and speed indicators for all Grok models

</details>

<details>
<summary><strong>v2.1.7</strong> · Database Security & Conductor Prompt Updates <sub>July 1, 2025 · 🔧 Improvement</sub></summary>

> Fixed critical RLS policy issues and enhanced conductor AI instructions for better user experience.

  - 🐛 Fix 🔧 Fixed RLS Policy Violations: Resolved 'row violates row-level security policy' errors in conductor message saving
  - 🔧 Improvement 🛡️ Enhanced Conversation Security: Added automatic conversation creation with proper user_id validation
  - 🔧 Improvement 🤖 Updated Conductor Prompts: Enhanced AI conductor instructions with more detailed role descriptions and example execution
  - 🔧 Improvement 📋 Better Error Handling: Improved database constraint handling for message operations
  - 🔧 Improvement 🔒 Strengthened Authentication: Added comprehensive user authentication checks in conductor service
  - 🔧 Improvement ⚡ Optimized Message Flow: Streamlined conductor message saving with proper conversation validation

</details>

---

### June 2025

<details>
<summary><strong>v2.1.6</strong> · Conductor Mode & Admin Panel Updates <sub>June 29, 2025 · 🔧 Improvement</sub></summary>

> Enhanced conductor mode interface and improved admin panel functionality with better user management.

  - ✨ Feature 🤖 Added Gemini Support: Gemini is now available as a conductor agent option
  - 🔧 Improvement 🎨 Enhanced Conductor UI: Redesigned conductor agent selector with better visual hierarchy and icons
  - 🔧 Improvement 💬 Updated Conversation Mode: Default message limit increased from 5 to 25 for longer discussions
  - 🔧 Improvement 🔧 Better Conductor Interface: Improved dropdown design with agent descriptions and color coding
  - 🔧 Improvement 👥 Admin Panel Enhancement: Admins can now view all users' data including profiles, tokens, and settings
  - 🔧 Improvement 🛡️ Secure Admin Access: Added proper RLS policies for admin user management capabilities

</details>

<details>
<summary><strong>v2.1.5</strong> · Authentication & Database Stability Improvements <sub>June 29, 2025 · 🔧 Improvement</sub></summary>

> Major backend improvements to fix authentication issues and enhance user onboarding reliability.

  - 🐛 Fix 🔧 Fixed Duplicate User Setup: Resolved race condition causing duplicate key constraint violations during user registration
  - 🔧 Improvement 🛠️ Consolidated Database Triggers: Streamlined user initialization into a single, reliable database trigger
  - 🐛 Fix ⚡ Enhanced Authentication Flow: Fixed token initialization and profile creation conflicts
  - 🔧 Improvement 🔒 Improved User Onboarding: More reliable automatic setup of user profiles and default tokens
  - 🔧 Improvement 📊 Better Error Handling: Enhanced database constraint handling to prevent signup failures
  - 🔧 Improvement 🎯 Optimized Agent Settings: Streamlined default agent configuration setup for new users

</details>
<!-- AUTO:CHANGELOG:END -->

---

## Tech

Vite · React 18 · TypeScript · Tailwind · shadcn-ui · Lovable Cloud (Supabase) · Lovable AI Gateway.

## Develop

```sh
npm i
npm run dev
```
