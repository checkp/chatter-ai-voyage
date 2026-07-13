// MCP Streamable HTTP server for RoboHeard.
//
// Exposes RoboHeard's conductor, individual model access, and web search to
// coding agents (Claude Code, Cursor, Codex, etc.) via the Model Context
// Protocol. Auth is a Supabase session JWT sent as `Authorization: Bearer`;
// tool handlers forward that same JWT to the existing chat edge functions so
// RLS, per-user token billing, and chat history all behave exactly like the
// browser UI.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROTOCOL_VERSION = "2025-06-18";

// ─── MCP tool catalog ───────────────────────────────────────────────────────
const PLATFORM_IDS = ["openai", "anthropic", "google", "grok", "deepseek", "perplexity", "mistral", "qwen"] as const;
type PlatformId = typeof PLATFORM_IDS[number];

const PLATFORM_TO_FN: Record<PlatformId, string> = {
  openai: "openai-chat",
  anthropic: "claude-chat",
  google: "gemini-chat",
  grok: "grok-chat",
  deepseek: "deepseek-chat",
  perplexity: "perplexity-chat",
  mistral: "mistral-chat",
  qwen: "qwen-chat",
};

const DEFAULT_MODELS: Record<PlatformId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
  google: "gemini-2.0-flash",
  grok: "grok-2-1212",
  deepseek: "deepseek-chat",
  perplexity: "sonar-pro",
  mistral: "mistral-small-latest",
  qwen: "qwen-plus",
};

const conductorPlatformProp = {
  type: "string",
  enum: PLATFORM_IDS as unknown as string[],
  description: "Which frontier model plays Conductor (routes + synthesizes). Defaults to openai.",
};
const includePlatformsProp = {
  type: "array",
  items: { type: "string", enum: PLATFORM_IDS as unknown as string[] },
  description: "Restrict the panel of agents. Defaults to a curated set of 4 frontier models.",
};

const TOOLS = [
  {
    name: "list_models",
    title: "List available models",
    description: "List RoboHeard's AI platforms and which advanced capabilities (think, search, deep_research, code_exec) each supports. Call first to discover what to route to.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "ask_model",
    title: "Ask a single AI model",
    description: "Send a prompt to ONE AI model through RoboHeard. Fastest and cheapest. Use when you already know which model is best. Persists to chat history.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: PLATFORM_IDS as unknown as string[], description: "Which AI provider to use." },
        prompt: { type: "string", description: "The user prompt." },
        model: { type: "string", description: "Optional model id (defaults to the platform's fast model)." },
        capabilities: {
          type: "object",
          description: "Optional advanced capabilities to enable for supported models.",
          properties: {
            think: { type: "boolean" },
            search: { type: "boolean" },
            deep_research: { type: "boolean" },
            code_exec: { type: "boolean" },
          },
          additionalProperties: false,
        },
        conversation_id: { type: "string", description: "Optional existing RoboHeard conversation UUID to continue." },
      },
      required: ["platform", "prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  {
    name: "web_search",
    title: "Live web search with citations",
    description:
      "Live web search grounded in real-time results with numbered source citations, powered by Perplexity Sonar. Returns { answer, citations: [{index, url, title}], model, query }. Use for time-sensitive facts, library changelogs, docs lookups, and anything the model's training data may not cover. Always cite the returned sources in your final answer.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        recency: { type: "string", enum: ["day", "week", "month", "year"], description: "Only include results from the last N (day/week/month/year)." },
        mode: { type: "string", enum: ["web", "academic", "sec"], description: "Search corpus. Defaults to web." },
        domains: {
          type: "array",
          items: { type: "string" },
          description: "Optional allow-list of domains (e.g. ['docs.python.org','github.com']). Prefix with '-' to exclude.",
        },
        max_results: { type: "number", description: "Approximate max sources to consider, 1-20. Defaults to 8." },
        model: { type: "string", enum: ["sonar", "sonar-pro", "sonar-reasoning", "sonar-reasoning-pro"], description: "Perplexity model. Defaults to sonar-pro." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },


  // ─── Conductor family ────────────────────────────────────────────────────
  {
    name: "conductor_ask",
    title: "Conductor — orchestrated multi-model answer",
    description:
      "Run RoboHeard's Conductor: one model routes the prompt across a panel of frontier AIs, collects their perspectives, and synthesizes a single best answer. Pick this over ask_model when the question is ambiguous, high-stakes, benefits from diverse viewpoints, or spans multiple domains. Persists to chat history.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The user prompt to route across the panel." },
        conductor_platform: conductorPlatformProp,
        include_platforms: includePlatformsProp,
        conversation_id: { type: "string", description: "Optional existing conversation UUID to continue." },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  {
    name: "conductor_route",
    title: "Conductor — routing plan only",
    description:
      "Ask the Conductor which agents SHOULD answer a prompt and why, without actually fanning out. Cheap. Use to preview a plan before committing tokens with conductor_ask or conductor_debate.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        conductor_platform: conductorPlatformProp,
        include_platforms: includePlatformsProp,
      },
      required: ["prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "conductor_compare",
    title: "Conductor — raw multi-model perspectives",
    description:
      "Fan the prompt out to the panel and return each agent's raw answer side-by-side, WITHOUT a synthesis step. Use when you want to compare model outputs yourself, benchmark, or feed multiple perspectives back into your own agent. Cheaper than conductor_ask.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        include_platforms: includePlatformsProp,
        conversation_id: { type: "string" },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  {
    name: "conductor_debate",
    title: "Conductor — multi-round critique loop",
    description:
      "Run the Conductor N times in a critique-and-improve loop, ending with a final synthesized answer. Use for hard reasoning problems, code review, architecture decisions, or research where one pass isn't enough. Slower and consumes more tokens.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        iterations: { type: "number", description: "Number of rounds, 2-5. Defaults to 3." },
        conductor_platform: conductorPlatformProp,
        include_platforms: includePlatformsProp,
        conversation_id: { type: "string" },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },

  // ─── Deprecated aliases (kept for backward compatibility) ────────────────
  {
    name: "ask_conductor",
    title: "Conductor (deprecated alias)",
    description: "Deprecated alias for conductor_ask. Prefer conductor_ask.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        conductor_platform: conductorPlatformProp,
        include_platforms: includePlatformsProp,
        conversation_id: { type: "string" },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "iterate",
    title: "Iterate (deprecated alias)",
    description: "Deprecated alias for conductor_debate. Prefer conductor_debate.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        iterations: { type: "number" },
        conductor_platform: conductorPlatformProp,
        include_platforms: includePlatformsProp,
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
];


// ─── Auth ───────────────────────────────────────────────────────────────────
interface AuthCtx {
  userId: string;
  jwt: string;
  supabase: ReturnType<typeof createClient>;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function mintSessionJwt(admin: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData.user?.email) throw new Error("Could not resolve user");
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (linkErr || !linkData?.properties?.hashed_token) throw new Error("Could not mint session");
  const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data: verified, error: vErr } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: linkData.properties.hashed_token });
  if (vErr || !verified.session) throw new Error("Could not verify session");
  return verified.session.access_token;
}

async function authenticate(req: Request): Promise<AuthCtx | null> {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Long-lived RoboHeard MCP/API token (rh_...): lookup by hash, mint session JWT for onward calls.
  if (token.startsWith("rh_")) {
    const hash = await sha256Hex(token);
    const { data } = await admin
      .from("roboheard_api_keys")
      .select("id, user_id, revoked_at, expires_at")
      .eq("key_hash", hash)
      .maybeSingle();
    if (!data || data.revoked_at) return null;
    if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) return null;
    admin.from("roboheard_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
    try {
      const sessionJwt = await mintSessionJwt(admin, data.user_id as string);
      return { userId: data.user_id as string, jwt: sessionJwt, supabase: admin };
    } catch {
      return null;
    }
  }

  // Standard Supabase session JWT (browser).
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return { userId: data.user.id, jwt: token, supabase: admin };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
async function callChatFn(fnName: string, body: Record<string, unknown>, jwt: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* pass */ }
  if (!res.ok) {
    const msg = (json.error as string) || text || `${fnName} failed with ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function ensureConversation(
  ctx: AuthCtx,
  opts: { conversationId?: string; title: string; chatMode: string; conductorPlatform?: string },
): Promise<string> {
  if (opts.conversationId) return opts.conversationId;
  const { data, error } = await ctx.supabase
    .from("conversations")
    .insert({
      user_id: ctx.userId,
      title: opts.title,
      chat_mode: opts.chatMode,
      conductor_platform: opts.conductorPlatform ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to create conversation: ${error?.message}`);
  return data.id as string;
}

async function saveMessage(
  ctx: AuthCtx,
  conversationId: string,
  sender: "user" | "ai",
  content: string,
  platform?: string,
): Promise<void> {
  const { error } = await ctx.supabase.from("messages").insert({
    conversation_id: conversationId,
    sender,
    content,
    platform: platform ?? null,
  });
  if (error) console.error("saveMessage error:", error.message);
}

async function loadHistory(ctx: AuthCtx, conversationId: string): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data } = await ctx.supabase
    .from("messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((m: { sender: string; content: string }) => ({
    role: m.sender === "user" ? "user" as const : "assistant" as const,
    content: m.content,
  }));
}

// ─── User MCP settings ──────────────────────────────────────────────────────
interface McpSettings {
  enabledTools: Set<string>;
  enabledPlatforms: Set<PlatformId>;
  defaultConductorPlatform: PlatformId;
  defaultWebSearchModel: string;
}

const ALL_TOOL_NAMES = TOOLS.map((t) => t.name);
const DEFAULT_SETTINGS: McpSettings = {
  enabledTools: new Set(ALL_TOOL_NAMES),
  enabledPlatforms: new Set(PLATFORM_IDS),
  defaultConductorPlatform: "openai",
  defaultWebSearchModel: "sonar-pro",
};

async function loadMcpSettings(ctx: AuthCtx): Promise<McpSettings> {
  const { data } = await ctx.supabase
    .from("user_mcp_settings")
    .select("enabled_tools, enabled_platforms, default_conductor_platform, default_web_search_model")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  const row = data as {
    enabled_tools: string[];
    enabled_platforms: string[];
    default_conductor_platform: string;
    default_web_search_model: string;
  };
  return {
    enabledTools: new Set(row.enabled_tools ?? ALL_TOOL_NAMES),
    enabledPlatforms: new Set((row.enabled_platforms ?? PLATFORM_IDS) as PlatformId[]),
    defaultConductorPlatform: (row.default_conductor_platform as PlatformId) ?? "openai",
    defaultWebSearchModel: row.default_web_search_model ?? "sonar-pro",
  };
}

// ─── Tool handlers ──────────────────────────────────────────────────────────
async function toolListModels(ctx: AuthCtx) {
  const { data } = await ctx.supabase
    .from("model_pricing")
    .select("platform, model_id, cost_tier")
    .order("platform");
  const byPlatform: Record<string, string[]> = {};
  for (const row of (data ?? []) as Array<{ platform: string; model_id: string }>) {
    (byPlatform[row.platform] ??= []).push(row.model_id);
  }
  const capMatrix: Record<string, Record<string, boolean>> = {
    openai:     { think: true,  search: true,  deep_research: true,  code_exec: true  },
    anthropic:  { think: true,  search: true,  deep_research: true,  code_exec: true  },
    google:     { think: true,  search: true,  deep_research: true,  code_exec: true  },
    grok:       { think: true,  search: true,  deep_research: true,  code_exec: false },
    deepseek:   { think: true,  search: false, deep_research: true,  code_exec: false },
    perplexity: { think: true,  search: true,  deep_research: true,  code_exec: false },
    mistral:    { think: false, search: false, deep_research: false, code_exec: false },
    qwen:       { think: false, search: false, deep_research: false, code_exec: false },
  };
  return {
    platforms: PLATFORM_IDS.map((id) => ({
      id,
      default_model: DEFAULT_MODELS[id],
      models: byPlatform[id] ?? [DEFAULT_MODELS[id]],
      capabilities: capMatrix[id],
    })),
  };
}

async function toolAskModel(ctx: AuthCtx, args: Record<string, unknown>) {
  const platform = args.platform as PlatformId;
  const prompt = String(args.prompt ?? "");
  if (!PLATFORM_IDS.includes(platform)) throw new Error(`Unknown platform: ${platform}`);
  if (!prompt) throw new Error("prompt is required");
  const model = (args.model as string | undefined) ?? DEFAULT_MODELS[platform];
  const capabilities = (args.capabilities as Record<string, boolean> | undefined) ?? {};

  const conversationId = await ensureConversation(ctx, {
    conversationId: args.conversation_id as string | undefined,
    title: prompt.slice(0, 60),
    chatMode: "free",
  });

  const history = await loadHistory(ctx, conversationId);
  await saveMessage(ctx, conversationId, "user", prompt);

  const messages = [...history, { role: "user" as const, content: prompt }];
  const result = await callChatFn(PLATFORM_TO_FN[platform], { messages, model, capabilities }, ctx.jwt);
  const content = (result.content as string) ?? "";
  await saveMessage(ctx, conversationId, "ai", content, platform);
  return { platform, model, conversation_id: conversationId, content };
}

const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");

async function toolWebSearch(_ctx: AuthCtx, args: Record<string, unknown>) {
  const query = String(args.query ?? "").trim();
  if (!query) throw new Error("query is required");
  if (!PERPLEXITY_KEY) throw new Error("Web search unavailable: PERPLEXITY_API_KEY is not configured on the server.");

  const model = (args.model as string | undefined) ?? "sonar-pro";
  const recency = args.recency as string | undefined;
  const mode = (args.mode as string | undefined) ?? "web";
  const domains = Array.isArray(args.domains) ? (args.domains as string[]).slice(0, 20) : undefined;
  const maxResults = Math.min(20, Math.max(1, Number(args.max_results ?? 8)));

  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a research assistant. Answer the user's query concisely using ONLY the retrieved web sources. Use inline numeric citations like [1], [2] tied to the citations array. Prefer authoritative and recent sources. If sources conflict, say so.",
      },
      { role: "user", content: query },
    ],
    return_related_questions: false,
    max_tokens: 1500,
  };
  if (recency) (body as any).search_recency_filter = recency;
  if (mode && mode !== "web") (body as any).search_mode = mode;
  if (domains && domains.length > 0) (body as any).search_domain_filter = domains;
  if (maxResults) (body as any).web_search_options = { search_context_size: maxResults >= 12 ? "high" : maxResults >= 6 ? "medium" : "low" };

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PERPLEXITY_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Perplexity ${res.status}: ${errText.slice(0, 400)}`);
  }
  const data = await res.json();
  const answer = String(data?.choices?.[0]?.message?.content ?? "");
  const rawCitations: Array<string | { url?: string; title?: string }> = data?.citations ?? data?.search_results ?? [];
  const citations = rawCitations.map((c, i) => {
    const url = typeof c === "string" ? c : (c?.url ?? "");
    const title = typeof c === "string" ? undefined : c?.title;
    return { index: i + 1, url, ...(title ? { title } : {}) };
  }).filter((c) => c.url);

  return {
    query,
    model,
    answer,
    citations,
    usage: data?.usage ?? undefined,
    search_mode: mode,
    recency: recency ?? null,
  };
}


async function runConductorRound(
  ctx: AuthCtx,
  opts: { conversationId: string; prompt: string; conductorPlatform: PlatformId; includePlatforms: PlatformId[] },
) {
  const { conversationId, prompt, conductorPlatform, includePlatforms } = opts;
  // 1. Conductor decision
  const decisionPrompt = `You are the Conductor coordinating multiple AI agents.
User message: "${prompt}"
Available agents: ${includePlatforms.join(", ")}
Provide a brief coordination plan, then respond. Add [COORDINATION_NEEDED: YES] to trigger multi-agent fan-out, or [COORDINATION_NEEDED: NO] to answer solo.`;
  const decisionRes = await callChatFn(PLATFORM_TO_FN[conductorPlatform], {
    messages: [{ role: "user", content: decisionPrompt }],
    model: DEFAULT_MODELS[conductorPlatform],
  }, ctx.jwt);
  const decision = String(decisionRes.content ?? "");
  await saveMessage(ctx, conversationId, "ai", decision, conductorPlatform);

  const needsFanout = !/\[COORDINATION_NEEDED:\s*NO\s*\]/i.test(decision);
  if (!needsFanout) return { decision, agent_responses: [], synthesis: decision };

  // 2. Fan-out
  const coordinationPrompt = `The Conductor asked for your perspective on: "${prompt}"

Conductor's plan: ${decision}

Provide your specialized angle.`;
  const agentCalls = await Promise.allSettled(
    includePlatforms.map(async (p) => {
      const res = await callChatFn(PLATFORM_TO_FN[p], {
        messages: [{ role: "user", content: coordinationPrompt }],
        model: DEFAULT_MODELS[p],
      }, ctx.jwt);
      return { platform: p, content: String(res.content ?? "") };
    }),
  );
  const agentResponses = agentCalls
    .filter((r): r is PromiseFulfilledResult<{ platform: PlatformId; content: string }> => r.status === "fulfilled")
    .map((r) => r.value);
  for (const ar of agentResponses) {
    await saveMessage(ctx, conversationId, "ai", ar.content, ar.platform);
  }

  // 3. Synthesis
  if (agentResponses.length === 0) return { decision, agent_responses: [], synthesis: decision };
  const synthesisPrompt = `Synthesize these agent responses into one coherent answer for the user.

Original question: "${prompt}"

${agentResponses.map((a) => `[${a.platform}]:\n${a.content}`).join("\n\n")}

Provide the best synthesized answer.`;
  const synthRes = await callChatFn(PLATFORM_TO_FN[conductorPlatform], {
    messages: [{ role: "user", content: synthesisPrompt }],
    model: DEFAULT_MODELS[conductorPlatform],
  }, ctx.jwt);
  const synthesis = String(synthRes.content ?? "");
  await saveMessage(ctx, conversationId, "ai", synthesis, conductorPlatform);
  return { decision, agent_responses: agentResponses, synthesis };
}

async function toolAskConductor(ctx: AuthCtx, args: Record<string, unknown>) {
  const prompt = String(args.prompt ?? "");
  if (!prompt) throw new Error("prompt is required");
  const conductorPlatform = ((args.conductor_platform as PlatformId) ?? "openai");
  if (!PLATFORM_IDS.includes(conductorPlatform)) throw new Error(`Unknown conductor_platform: ${conductorPlatform}`);
  const includeRaw = (args.include_platforms as PlatformId[] | undefined);
  const includePlatforms = (includeRaw && includeRaw.length > 0
    ? includeRaw
    : PLATFORM_IDS.filter((p) => p !== conductorPlatform).slice(0, 4)
  ) as PlatformId[];

  const conversationId = await ensureConversation(ctx, {
    conversationId: args.conversation_id as string | undefined,
    title: `MCP: ${prompt.slice(0, 50)}`,
    chatMode: "conductor",
    conductorPlatform,
  });
  await saveMessage(ctx, conversationId, "user", prompt);

  const round = await runConductorRound(ctx, { conversationId, prompt, conductorPlatform, includePlatforms });
  return { conversation_id: conversationId, ...round };
}

function resolvePanel(conductorPlatform: PlatformId, includeRaw?: PlatformId[]): PlatformId[] {
  return (includeRaw && includeRaw.length > 0
    ? includeRaw
    : PLATFORM_IDS.filter((p) => p !== conductorPlatform).slice(0, 4)) as PlatformId[];
}

async function toolConductorRoute(ctx: AuthCtx, args: Record<string, unknown>) {
  const prompt = String(args.prompt ?? "");
  if (!prompt) throw new Error("prompt is required");
  const conductorPlatform = ((args.conductor_platform as PlatformId) ?? "openai");
  if (!PLATFORM_IDS.includes(conductorPlatform)) throw new Error(`Unknown conductor_platform: ${conductorPlatform}`);
  const includePlatforms = resolvePanel(conductorPlatform, args.include_platforms as PlatformId[] | undefined);

  const planPrompt = `You are the RoboHeard Conductor. Do NOT answer the user's question.
Instead, return a JSON routing plan with fields:
  { "strategy": "solo"|"fanout"|"debate", "agents": string[], "reasoning": string }
where "agents" is a subset of: ${includePlatforms.join(", ")}.
User prompt: "${prompt}"
Reply with ONLY the JSON object.`;
  const res = await callChatFn(PLATFORM_TO_FN[conductorPlatform], {
    messages: [{ role: "user", content: planPrompt }],
    model: DEFAULT_MODELS[conductorPlatform],
  }, ctx.jwt);
  const raw = String(res.content ?? "");
  let plan: unknown = raw;
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { plan = JSON.parse(match[0]); } catch { /* keep raw */ } }
  return { conductor_platform: conductorPlatform, panel: includePlatforms, plan };
}

async function toolConductorCompare(ctx: AuthCtx, args: Record<string, unknown>) {
  const prompt = String(args.prompt ?? "");
  if (!prompt) throw new Error("prompt is required");
  const includePlatforms = resolvePanel("openai", args.include_platforms as PlatformId[] | undefined);

  const conversationId = await ensureConversation(ctx, {
    conversationId: args.conversation_id as string | undefined,
    title: `MCP compare: ${prompt.slice(0, 40)}`,
    chatMode: "side-by-side",
  });
  await saveMessage(ctx, conversationId, "user", prompt);

  const calls = await Promise.allSettled(
    includePlatforms.map(async (p) => {
      const res = await callChatFn(PLATFORM_TO_FN[p], {
        messages: [{ role: "user", content: prompt }],
        model: DEFAULT_MODELS[p],
      }, ctx.jwt);
      return { platform: p, model: DEFAULT_MODELS[p], content: String(res.content ?? "") };
    }),
  );
  const perspectives = calls.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { platform: includePlatforms[i], model: DEFAULT_MODELS[includePlatforms[i]], content: "", error: r.reason?.message ?? String(r.reason) },
  );
  for (const p of perspectives) {
    if (p.content) await saveMessage(ctx, conversationId, "ai", p.content, p.platform);
  }
  return { conversation_id: conversationId, perspectives };
}



async function toolIterate(ctx: AuthCtx, args: Record<string, unknown>) {
  const prompt = String(args.prompt ?? "");
  if (!prompt) throw new Error("prompt is required");
  const iterations = Math.min(5, Math.max(2, Number(args.iterations ?? 3)));
  const conductorPlatform = ((args.conductor_platform as PlatformId) ?? "openai");
  const includeRaw = (args.include_platforms as PlatformId[] | undefined);
  const includePlatforms = (includeRaw && includeRaw.length > 0
    ? includeRaw
    : PLATFORM_IDS.filter((p) => p !== conductorPlatform).slice(0, 4)
  ) as PlatformId[];

  const conversationId = await ensureConversation(ctx, {
    title: `MCP iterate: ${prompt.slice(0, 40)}`,
    chatMode: "conductor",
    conductorPlatform,
  });
  await saveMessage(ctx, conversationId, "user", prompt);

  const rounds: Array<{ iteration: number; synthesis: string }> = [];
  let currentPrompt = prompt;
  for (let i = 1; i <= iterations; i++) {
    const isFinal = i === iterations;
    const framedPrompt = i === 1
      ? currentPrompt
      : `Iteration ${i} of ${iterations}${isFinal ? " (FINAL)" : ""}. Prior synthesis:\n\n${currentPrompt}\n\nCritique it, resolve gaps, and produce ${isFinal ? "the final answer" : "an improved answer"} to the original question: "${prompt}"`;
    const round = await runConductorRound(ctx, {
      conversationId,
      prompt: framedPrompt,
      conductorPlatform,
      includePlatforms,
    });
    rounds.push({ iteration: i, synthesis: round.synthesis });
    currentPrompt = round.synthesis;
  }
  return { conversation_id: conversationId, iterations: rounds, final: rounds[rounds.length - 1].synthesis };
}

// ─── MCP dispatch ───────────────────────────────────────────────────────────
type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

async function handleRpc(rpc: JsonRpcRequest, ctx: AuthCtx | null): Promise<Record<string, unknown> | null> {
  const { id, method, params } = rpc;
  const respond = (result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  if (method === "initialize") {
    return respond({
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "roboheard-mcp", version: "0.2.0" },
      instructions:
        "RoboHeard MCP — multi-model orchestration. Discovery: call list_models first. Single-model: ask_model. Web facts: web_search. Orchestrated (multi-model) reasoning: prefer the conductor_* family — conductor_route (plan only), conductor_compare (raw perspectives), conductor_ask (routed + synthesized answer), conductor_debate (multi-round critique loop). All calls consume the user's RoboHeard tokens.",
    });
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") return null;
  if (method === "ping") return respond({});
  if (method === "tools/list") {
    if (!ctx) return respond({ tools: TOOLS });
    const settings = await loadMcpSettings(ctx);
    return respond({ tools: TOOLS.filter((t) => settings.enabledTools.has(t.name)) });
  }

  if (method === "tools/call") {
    if (!ctx) return err(-32001, "Unauthorized: missing or invalid Bearer token");
    const name = params?.name as string;
    const args = { ...((params?.arguments as Record<string, unknown>) ?? {}) };
    try {
      const settings = await loadMcpSettings(ctx);
      if (!settings.enabledTools.has(name)) {
        return respond({ content: [{ type: "text", text: `Tool "${name}" is disabled in your MCP settings. Enable it at /mcp in RoboHeard.` }], isError: true });
      }
      // Enforce platform allow-list on args.
      if (typeof args.platform === "string" && !settings.enabledPlatforms.has(args.platform as PlatformId)) {
        return respond({ content: [{ type: "text", text: `Platform "${args.platform}" is disabled in your MCP settings.` }], isError: true });
      }
      if (Array.isArray(args.include_platforms)) {
        args.include_platforms = (args.include_platforms as string[]).filter((p) => settings.enabledPlatforms.has(p as PlatformId));
      }
      // Apply defaults.
      if ((name === "conductor_ask" || name === "conductor_route" || name === "conductor_compare" || name === "conductor_debate" || name === "ask_conductor" || name === "iterate") && !args.conductor_platform) {
        args.conductor_platform = settings.defaultConductorPlatform;
      }
      if (name === "web_search" && !args.model) {
        args.model = settings.defaultWebSearchModel;
      }
      let out: unknown;
      switch (name) {
        case "list_models":        out = await toolListModels(ctx); break;
        case "ask_model":          out = await toolAskModel(ctx, args); break;
        case "web_search":         out = await toolWebSearch(ctx, args); break;
        case "conductor_ask":
        case "ask_conductor":      out = await toolAskConductor(ctx, args); break;
        case "conductor_debate":
        case "iterate":            out = await toolIterate(ctx, args); break;
        case "conductor_route":    out = await toolConductorRoute(ctx, args); break;
        case "conductor_compare":  out = await toolConductorCompare(ctx, args); break;
        default: return err(-32601, `Unknown tool: ${name}`);
      }
      return respond({
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        structuredContent: out,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return respond({ content: [{ type: "text", text: `Error: ${msg}` }], isError: true });
    }
  }

  return err(-32601, `Unknown method: ${method}`);
}

// ─── HTTP ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    // Discovery ping
    return new Response(JSON.stringify({
      name: "roboheard-mcp",
      version: "0.1.0",
      protocolVersion: PROTOCOL_VERSION,
      transport: "streamable-http",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ctx = await authenticate(req);
  const requests = Array.isArray(body) ? body : [body];
  const responses: Array<Record<string, unknown>> = [];
  for (const rpc of requests) {
    const resp = await handleRpc(rpc, ctx);
    if (resp) responses.push(resp);
  }

  // If every incoming request was a notification, return 202 with no body.
  if (responses.length === 0) return new Response(null, { status: 202, headers: corsHeaders });

  const payload = Array.isArray(body) ? responses : responses[0];
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
