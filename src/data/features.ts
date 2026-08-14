// Canonical feature list for RoboHeard.
// Surface for /features page, SEO, and onboarding copy.
// Keep this file in sync with new releases (see src/data/changelog.ts).

export interface Feature {
  title: string;
  description: string;
  tag?: string;
}

export interface FeatureCategory {
  id: string;
  name: string;
  blurb: string;
  features: Feature[];
}

export const featureCategories: FeatureCategory[] = [
  {
    id: "models",
    name: "Eight Frontier Models — Plus Yours",
    blurb: "Every flagship LLM, in one calm workspace — pick one, compare a few, run all eight in parallel, or bring your own local model.",
    features: [
      { title: "OpenAI GPT-5", description: "Latest reasoning model from OpenAI, including GPT-5 and GPT-4o variants." },
      { title: "Anthropic Claude 4", description: "Claude Opus 4 and Sonnet 4 — long-form analysis, careful writing, structured thinking." },
      { title: "Google Gemini 2.5", description: "Gemini 2.5 Pro and Flash with million-token context for long documents." },
      { title: "xAI Grok-4", description: "Grok 4 and Grok 4 Fast — sharp, current, opinionated." },
      { title: "DeepSeek R2", description: "Open-source reasoning depth at a fraction of the cost." },
      { title: "Mistral Large", description: "Mistral Large, Medium, Small and Codestral for multilingual and coding work." },
      { title: "Perplexity Sonar", description: "Sonar Pro and Sonar Reasoning Pro with live web search and source citations." },
      { title: "Alibaba Qwen", description: "Qwen Max, Plus, Turbo and Qwen3-Max via DashScope — strong multilingual reasoning." },
      { title: "Local Models", description: "Add any model running in LM Studio or Ollama as a Local agent — private, offline-capable, and a flat 1 token per message.", tag: "New" }
    ]
  },
  {
    id: "modes",
    name: "Five Chat Modes",
    blurb: "Match the interaction pattern to your task — collaboration, comparison, solo focus, or building.",
    features: [
      { title: "Conductor Mode", tag: "Flagship", description: "A meta-agent plans the work, delegates to specialists, mediates disagreements, and returns a synthesised answer." },
      { title: "Discussion Mode", description: "All enabled agents see each other's messages and build on one another — a roundtable conversation." },
      { title: "Isolated Mode", description: "Each agent answers independently. Ideal for honest, unbiased comparison of replies." },
      { title: "Side-by-Side Mode", description: "Dedicated columns per agent for quick visual scanning of parallel responses." },
      { title: "Build Mode", tag: "New", description: "Split chat and live artifact: you and the agents iterate on one self-contained web app or Python script. The panel splits into the running artifact plus a code browser and console, with instant preview, version history, hand editing, and download." },
      { title: "Python Sandbox", tag: "New", description: "Build mode runs real CPython in your browser via Pyodide — numpy, pandas, matplotlib, scipy and scikit-learn included, matplotlib figures rendered inline, and an interactive console that shares the session with the script." },
      { title: "Compound Engineering", tag: "New", description: "Build mode agents run a real pipeline: an orchestrator writes acceptance criteria, implementers build against them, QA hardens the suite, and a reviewer gates the result with repair rounds while tests are red." },
      { title: "TDD Harness & Proof of Work", tag: "New", description: "Every revision is executed against its own tests in the sandbox it runs in — test_* functions in Pyodide, RH.test cases in a sandboxed iframe — and the per-test pass/fail report is posted into the chat and stored with the version." }

    ]
  },
  {
    id: "orchestration",
    name: "Agentic Orchestration",
    blurb: "Beyond chat — the Conductor turns eight models into one coordinated system.",
    features: [
      { title: "Task Delegation", description: "Conductor analyses your query and routes sub-tasks to the best-suited specialists." },
      { title: "Cross-Model Reasoning", description: "Combines distinct lenses — analytical, creative, multilingual, real-time — into a single answer." },
      { title: "Conflict Resolution", description: "When models disagree, the Conductor surfaces consensus, dissent, and the evidence behind each." },
      { title: "Live Synthesis", description: "Structured conclusions, action items, and minority viewpoints generated as agents respond." },
      { title: "Free Mode", description: "Multi-round autonomous debates between agents — emergent reasoning, hands-off." }
    ]
  },
  {
    id: "capabilities",
    name: "Advanced AI Capabilities",
    blurb: "Per-message superpowers — toggle in the composer or let the Conductor assign them per agent.",
    features: [
      { title: "Think (Extended Reasoning)", description: "Higher reasoning budgets across OpenAI, Claude, Gemini, Grok, DeepSeek-Reasoner, and Sonar Reasoning Pro.", tag: "new" },
      { title: "Search (Live Web)", description: "Provider-native web grounding — OpenAI web_search, Claude web_search, Gemini google_search, Grok search, always-on Perplexity.", tag: "new" },
      { title: "Deep Research", description: "Auto-swap to flagship research tiers: gpt-5, opus-4, gemini-2.5-pro, grok-4-heavy, sonar-deep-research, qwen-max.", tag: "new" },
      { title: "Code Execution", description: "Sandboxed code tools on OpenAI (code_interpreter), Claude (code_execution_20250522), and Gemini (code_execution).", tag: "new" },
      { title: "Conductor-Assigned", description: "Conductor can emit per-agent capability hints — the right tools fire on the right specialist automatically." }
    ]
  },
  {
    id: "research",
    name: "Market & Web Research",
    blurb: "Grounded answers with citations — not confident guesses.",
    features: [
      { title: "Live Web Search", description: "Perplexity Sonar pulls fresh sources in real time and includes inline citations." },
      { title: "Long-Document Analysis", description: "Gemini 2.5's million-token context reads entire reports, papers, and transcripts at once." },
      { title: "Cross-Model Fact Checking", description: "Other agents review Perplexity's claims so you don't take a single source on trust." },
      { title: "Sourced Briefs", description: "Conductor returns balanced, link-backed summaries instead of opinion." }
    ]
  },
  {
    id: "images",
    name: "Multi-Model Image Studio",
    blurb: "One brief, several visual minds. Render once, pick the result that fits.",
    features: [
      { title: "7 Image Models in Parallel", description: "DALL·E 3, GPT-Image-1, Gemini 2.5 Flash, Gemini 3 Pro, Grok Aurora, Qwen Wanx, Pollinations FLUX." },
      { title: "Conductor Image Synthesis", description: "Eight chat agents propose visual angles, the Conductor merges them into one master prompt before rendering." },
      { title: "Pollinations FLUX", description: "Open-source FLUX renderer included at just 10t per image." },
      { title: "Tiny Cost Preview", description: "Live credit estimate appears under the prompt — no popup pickers interrupting flow." },
      { title: "Resilient Gateway", description: "Auto-fallback to direct providers when the Lovable Gateway returns 402/429/5xx." }
    ]
  },
  {
    id: "workspace",
    name: "Workspace & Controls",
    blurb: "Small details that make multi-agent work feel calm instead of chaotic.",
    features: [
      { title: "Per-Agent Settings", description: "Pick model variant and write custom instructions per agent — auto-saved, no save button." },
      { title: "Reorderable Agent Bar", description: "Drag agents into your preferred order; layout persists." },
      { title: "Activity Console", description: "Floating console shows live agent status, token use, and errors as they happen." },
      { title: "Auto-Renamed Chats", description: "New conversations are titled from your first message automatically." },
      { title: "Mobile Interface", description: "Dedicated mobile layout with auto-hiding header and bottom action button." },
      { title: "Guided Tour", description: "Step-by-step walkthrough of every mode, the Conductor, and Free Mode." },
      { title: "Light & Dark Themes", description: "Multiple themes including dark and high-contrast options." }
    ]
  },
  {
    id: "integrations",
    name: "Device Integrations",
    blurb: "Bring notes and files from your own hardware into the conversation.",
    features: [
      { title: "reMarkable Tablet", tag: "New", description: "Pair your reMarkable with an 8-character one-time code, browse notebooks and folders, and fetch any notebook as a rendered PDF." },
      { title: "Handwriting → Text", tag: "New", description: "AI transcription turns handwritten notebook pages into clean markdown you can search, edit, and reuse." },
      { title: "Notes as Chat Context", tag: "New", description: "Drop any transcribed note straight into the composer so every agent can reason over your handwritten thinking." },
      { title: "Private Note Storage", description: "Fetched PDFs live in a private, owner-scoped bucket with signed, expiring links — never public." }
    ]
  },

  {
    id: "mesh",
    name: "Mesh Hub",
    blurb: "Connect ConductorAI fleets running on your own machines and use their local models from the browser.",
    features: [
      { title: "Coordination Page", tag: "New", description: "Live view of every connected node — host, online state, its agents and what each one is working on, plus current repo focus." },
      { title: "Mesh Channels", tag: "New", description: "Realtime channel chat shared between you and every node in the fleet, with per-channel streams and node badges." },
      { title: "Mesh Models", tag: "New", description: "Every local Ollama model on the mesh, grouped by host, alongside RoboHeard's cloud platforms." },
      { title: "Broadcast Prompts", tag: "New", description: "Send one prompt to every selected model and watch the answers fill in side by side with live status and elapsed time." },
      { title: "Single-Model Chat", tag: "New", description: "Select one mesh model and it becomes a full conversation, replaying prior turns with every new question." }
    ]
  },


  {
    id: "account",
    name: "Account & Billing",
    blurb: "Transparent pricing, flexible access, no surprises.",
    features: [
      { title: "Token Balance", description: "Live balance in the header; per-message cost estimate before you send." },
      { title: "Token Packages", description: "Buy credits via LemonSqueezy — pay only for what you actually run." },
      { title: "Free Daily Conversations", description: "Free demo chat on the landing page; no signup required to try." },
      { title: "Transaction History", description: "Full record of token purchases and per-agent spend." }
    ]
  },
  {
    id: "trust",
    name: "Security & Reliability",
    blurb: "Production posture: strict RLS, encrypted secrets, retried calls.",
    features: [
      { title: "Row-Level Security", description: "Strict RLS on every table; user_id is derived from the JWT, never the request body." },
      { title: "Encrypted API Keys", description: "BYO provider keys are encrypted at rest and only decrypted server-side." },
      { title: "Private Image Storage", description: "Generated images live in a private bucket with owner-scoped policies and auto-refreshing signed URLs." },
      { title: "Retried AI Calls", description: "All AI API calls retry up to 3× with exponential backoff and fresh auth on each attempt." }
    ]
  }
];

export const totalFeatureCount = featureCategories.reduce(
  (sum, c) => sum + c.features.length,
  0
);
