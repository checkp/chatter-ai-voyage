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
const PLATFORM_IDS = ["openai", "anthropic", "google", "grok", "deepseek", "perplexity", "mistral", "qwen", "nvidia"] as const;
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
  nvidia: "nvidia-chat",
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
  nvidia: "nvidia/nemotron-3-nano-30b-a3b",
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
  // ─── Chat history (mirrors the OAuth /agent-mcp server) ──────────────────
  {
    name: "list_chats",
    title: "List chats",
    description: "List the user's most recent RoboHeard conversations, newest first.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "How many conversations to return (default 20, max 50)." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_chat",
    title: "Get chat messages",
    description: "Read the messages of one of the user's conversations, including which AI platform produced each reply.",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: { type: "string", description: "Conversation UUID, as returned by list_chats." },
        limit: { type: "number", description: "How many messages to return (default 50, newest last)." },
      },
      required: ["chat_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "search_messages",
    title: "Search messages",
    description: "Search across the user's RoboHeard chat messages, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to look for inside message content." },
        limit: { type: "number", description: "How many matches to return (default 20, max 50)." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
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

  // ─── Mesh hub (ConductorAI fleets) ───────────────────────────────────────
  {
    name: "hub_register",
    title: "Register a mesh node",
    description: "Register (or refresh) a ConductorAI node in the mesh hub. Returns the recommended poll interval.",
    inputSchema: {
      type: "object",
      properties: {
        mesh_id: { type: "string", description: "Stable UUID identifying this node." },
        name: { type: "string", description: "Human-friendly node name." },
        host: { type: "string", description: "Host/endpoint the node is reachable at locally." },
        version: { type: "string", description: "ConductorAI version running on the node." },
      },
      required: ["mesh_id", "name", "host"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  {
    name: "hub_sync",
    title: "Sync mesh node (presence, messages, jobs)",
    description: "Single round-trip mesh sync: reports presence, delivers job results, and returns new mesh messages plus queued local-model jobs for this node.",
    inputSchema: {
      type: "object",
      properties: {
        mesh_id: { type: "string" },
        cursor: { type: ["number", "null"], description: "Last mesh_messages id seen. Omit/null on the first sync to skip backlog." },
        presence: {
          type: "object",
          properties: {
            name: { type: "string" },
            host: { type: "string" },
            version: { type: "string" },
            agents: { type: "array", items: {} },
            repo_focus: { type: "array", items: {} },
            models: { type: "array", items: {} },
          },
          additionalProperties: true,
        },
        results: {
          type: "array",
          description: "Results for jobs previously handed to this node.",
          items: {
            type: "object",
            properties: {
              job_id: { type: "string" },
              status: { type: "string", enum: ["done", "error"] },
              reply: { type: "string" },
              error: { type: "string" },
            },
            required: ["job_id", "status"],
            additionalProperties: false,
          },
        },
      },
      required: ["mesh_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  {
    name: "hub_send",
    title: "Send a mesh message",
    description: "Post a message to a mesh channel so every connected node sees it on its next sync.",
    inputSchema: {
      type: "object",
      properties: {
        body: { type: "string" },
        channel: { type: "string", description: "Defaults to 'general'." },
        by: { type: "string", description: "Self-chosen author label (plain text)." },
        mesh_id: { type: "string", description: "Sending node id, when sent from a node." },
      },
      required: ["body", "by"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  {
    name: "hub_messages",
    title: "Read mesh messages",
    description: "Read mesh coordination messages, always ascending. With since_id it pages forward from the oldest unseen message; without it, returns the newest ones.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string" },
        since_id: { type: "number" },
        limit: { type: "number", description: "Defaults to 50." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "hub_presence",
    title: "List mesh nodes",
    description: "List mesh nodes seen in the last 7 days, plus a synthetic 'roboheard' cloud node exposing the caller's enabled cloud models.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "hub_ask",
    title: "Ask a mesh model",
    description: "Route a chat completion to a mesh node's local Ollama model, or to RoboHeard Cloud (mesh_id 'roboheard', model '<platform>/<model>') which runs immediately. Returns a job_id; poll with hub_job.",
    inputSchema: {
      type: "object",
      properties: {
        mesh_id: { type: "string" },
        host: { type: "string" },
        model: { type: "string" },
        messages: { type: "array", items: { type: "object", additionalProperties: true } },
        timeout_ms: { type: "number", description: "Defaults to 120000." },
      },
      required: ["mesh_id", "host", "model", "messages"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  {
    name: "hub_job",
    title: "Poll a mesh model job",
    description: "Check the status of a hub_ask job. Returns status, reply or error, and its age in seconds.",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "string" } },
      required: ["job_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
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
    nvidia:     { think: true,  search: false, deep_research: false, code_exec: false },

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

async function toolListChats(ctx: AuthCtx, args: Record<string, unknown>) {
  const limit = Math.min(50, Math.max(1, Number(args.limit ?? 20)));
  const { data, error } = await ctx.supabase
    .from("conversations")
    .select("id, title, chat_mode, conductor_platform, updated_at, created_at")
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return { chats: data ?? [] };
}

async function toolGetChat(ctx: AuthCtx, args: Record<string, unknown>) {
  const chatId = String(args.chat_id ?? "");
  if (!chatId) throw new Error("chat_id is required");
  const limit = Math.min(200, Math.max(1, Number(args.limit ?? 50)));
  const { data: convo } = await ctx.supabase
    .from("conversations")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!convo) throw new Error("Conversation not found");
  const { data, error } = await ctx.supabase
    .from("messages")
    .select("id, sender, platform, content, created_at")
    .eq("conversation_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return { conversation_id: chatId, messages: (data ?? []).slice().reverse() };
}

async function toolSearchMessages(ctx: AuthCtx, args: Record<string, unknown>) {
  const query = String(args.query ?? "").trim();
  if (query.length < 2) throw new Error("query must be at least 2 characters");
  const limit = Math.min(50, Math.max(1, Number(args.limit ?? 20)));
  const { data: convos } = await ctx.supabase
    .from("conversations")
    .select("id")
    .eq("user_id", ctx.userId);
  const ids = ((convos ?? []) as Array<{ id: string }>).map((c) => c.id);
  if (ids.length === 0) return { matches: [] };
  const { data, error } = await ctx.supabase
    .from("messages")
    .select("id, conversation_id, sender, platform, content, created_at")
    .in("conversation_id", ids)
    .ilike("content", `%${query.replace(/[%_]/g, "")}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return { matches: data ?? [] };
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

// ─── Mesh hub handlers ──────────────────────────────────────────────────────
const CLOUD_MESH_ID = "roboheard";
const HUB_TOOL_NAMES = new Set([
  "hub_register", "hub_sync", "hub_send", "hub_messages", "hub_presence", "hub_ask", "hub_job",
]);
const MAX_QUEUED_JOBS_PER_USER = 30;

/** Crash/timeout recovery sweep. Requeues stalled 'running' jobs and expires stale 'queued' ones. */
async function sweepJobs(ctx: AuthCtx): Promise<void> {
  const now = Date.now();
  const { data: running } = await ctx.supabase
    .from("hub_model_jobs")
    .select("id, timeout_ms, running_since")
    .eq("user_id", ctx.userId)
    .eq("status", "running");
  for (const job of (running ?? []) as Array<{ id: string; timeout_ms: number; running_since: string | null }>) {
    const since = job.running_since ? new Date(job.running_since).getTime() : 0;
    if (!since || now - since > (job.timeout_ms ?? 120000) + 30_000) {
      await ctx.supabase
        .from("hub_model_jobs")
        .update({ status: "queued", running_since: null, updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("user_id", ctx.userId)
        .eq("status", "running");
    }
  }
  const staleCutoff = new Date(now - 10 * 60_000).toISOString();
  await ctx.supabase
    .from("hub_model_jobs")
    .update({ status: "error", error: "node offline", updated_at: new Date().toISOString() })
    .eq("user_id", ctx.userId)
    .eq("status", "queued")
    .lt("created_at", staleCutoff);
}

async function upsertNode(
  ctx: AuthCtx,
  meshId: string,
  presence: { name?: string; host?: string; version?: string; agents?: unknown; repo_focus?: unknown; models?: unknown },
): Promise<string> {
  const name = String(presence.name ?? "node");
  const row: Record<string, unknown> = {
    mesh_id: meshId,
    user_id: ctx.userId,
    name,
    host: String(presence.host ?? "localhost"),
    version: presence.version ? String(presence.version) : null,
    agents: Array.isArray(presence.agents) ? presence.agents : [],
    repo_focus: Array.isArray(presence.repo_focus) ? presence.repo_focus : [],
    models: Array.isArray(presence.models) ? presence.models : [],
    last_seen: new Date().toISOString(),
  };
  const { error } = await ctx.supabase.from("hub_nodes").upsert(row, { onConflict: "mesh_id" });
  if (error) throw new Error(error.message);
  return name;
}

async function toolHubRegister(ctx: AuthCtx, args: Record<string, unknown>) {
  const meshId = String(args.mesh_id ?? "");
  if (!meshId) throw new Error("mesh_id is required");
  const name = await upsertNode(ctx, meshId, {
    name: args.name as string,
    host: args.host as string,
    version: args.version as string,
  });
  return { ok: true, node: name, poll_s: 5 };
}

async function toolHubSync(ctx: AuthCtx, args: Record<string, unknown>) {
  const meshId = String(args.mesh_id ?? "");
  if (!meshId) throw new Error("mesh_id is required");
  const presence = (args.presence as Record<string, unknown> | undefined) ?? {};

  // (a) sweep stalled / stale jobs first.
  await sweepJobs(ctx);

  // (b) presence upsert.
  await upsertNode(ctx, meshId, presence as never);

  // (c) apply results — only to jobs that are still queued/running.
  const results = Array.isArray(args.results) ? (args.results as Array<Record<string, unknown>>) : [];
  for (const r of results) {
    const jobId = String(r.job_id ?? "");
    const status = r.status === "error" ? "error" : "done";
    if (!jobId) continue;
    await ctx.supabase
      .from("hub_model_jobs")
      .update({
        status,
        reply: r.reply != null ? String(r.reply) : null,
        error: r.error != null ? String(r.error) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", ctx.userId)
      .in("status", ["queued", "running"]);
  }

  // (d) messages. `cursor` absent/null = first sync (no backlog). Numeric 0 IS a cursor.
  const rawCursor = args.cursor;
  const hasCursor = rawCursor !== undefined && rawCursor !== null && Number.isFinite(Number(rawCursor));
  let cursor = 0;
  let messages: Array<Record<string, unknown>> = [];
  if (!hasCursor) {
    const { data } = await ctx.supabase
      .from("hub_messages")
      .select("id")
      .eq("user_id", ctx.userId)
      .order("id", { ascending: false })
      .limit(1);
    cursor = Number((data?.[0] as { id: number } | undefined)?.id ?? 0);
  } else {
    cursor = Number(rawCursor);
    const { data } = await ctx.supabase
      .from("hub_messages")
      .select("id, channel, body, by, mesh_id, created_at")
      .eq("user_id", ctx.userId)
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(100);
    const rows = (data ?? []) as Array<{ id: number; channel: string; body: string; by: string; mesh_id: string | null; created_at: string }>;
    const meshIds = [...new Set(rows.map((r) => r.mesh_id).filter((m): m is string => !!m))];
    const nameByMesh: Record<string, string> = {};
    if (meshIds.length > 0) {
      const { data: nodes } = await ctx.supabase
        .from("hub_nodes")
        .select("mesh_id, name")
        .eq("user_id", ctx.userId)
        .in("mesh_id", meshIds);
      for (const n of (nodes ?? []) as Array<{ mesh_id: string; name: string }>) nameByMesh[n.mesh_id] = n.name;
    }
    messages = rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      body: r.body,
      by: r.by,
      mesh: r.mesh_id ? (nameByMesh[r.mesh_id] ?? null) : null,
      at: new Date(r.created_at).getTime(),
    }));
    if (rows.length > 0) cursor = rows[rows.length - 1].id;
  }

  // (e) hand out queued jobs targeted at this node.
  const { data: queued } = await ctx.supabase
    .from("hub_model_jobs")
    .select("id, target_host, model, messages, timeout_ms")
    .eq("user_id", ctx.userId)
    .eq("target_mesh_id", meshId)
    .eq("status", "queued")
    .order("created_at", { ascending: true });
  const jobs = ((queued ?? []) as Array<{ id: string; target_host: string; model: string; messages: unknown; timeout_ms: number }>).map((j) => ({
    id: j.id,
    host: j.target_host,
    model: j.model,
    messages: j.messages,
    timeout_ms: j.timeout_ms,
  }));
  if (jobs.length > 0) {
    await ctx.supabase
      .from("hub_model_jobs")
      .update({ status: "running", running_since: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", ctx.userId)
      .in("id", jobs.map((j) => j.id))
      .eq("status", "queued");
  }

  return { now: Date.now(), cursor, messages, jobs };
}

async function toolHubSend(ctx: AuthCtx, args: Record<string, unknown>) {
  const body = String(args.body ?? "");
  const by = String(args.by ?? "");
  if (!body) throw new Error("body is required");
  if (!by) throw new Error("by is required");
  const { data, error } = await ctx.supabase
    .from("hub_messages")
    .insert({
      user_id: ctx.userId,
      mesh_id: args.mesh_id ? String(args.mesh_id) : null,
      channel: args.channel ? String(args.channel) : "general",
      body,
      by,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to send message");
  return { id: Number((data as { id: number }).id) };
}

async function toolHubMessages(ctx: AuthCtx, args: Record<string, unknown>) {
  const limit = Math.min(200, Math.max(1, Number(args.limit ?? 50)));
  const hasSince = args.since_id !== undefined && args.since_id !== null && Number.isFinite(Number(args.since_id));
  let q = ctx.supabase
    .from("hub_messages")
    .select("id, channel, body, by, mesh_id, created_at")
    .eq("user_id", ctx.userId);
  if (args.channel) q = q.eq("channel", String(args.channel));
  if (hasSince) {
    // Forward pagination: OLDEST unseen rows first, so a burst is never skipped.
    q = q.gt("id", Number(args.since_id)).order("id", { ascending: true }).limit(limit);
  } else {
    q = q.order("id", { ascending: false }).limit(limit);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ id: number; channel: string; body: string; by: string; mesh_id: string | null; created_at: string }>;
  const ordered = hasSince ? rows : rows.slice().reverse();
  return {
    messages: ordered.map((r) => ({
      id: r.id,
      channel: r.channel,
      body: r.body,
      by: r.by,
      mesh_id: r.mesh_id,
      at: new Date(r.created_at).getTime(),
    })),
  };
}

async function toolHubPresence(ctx: AuthCtx, settings: McpSettings) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const { data, error } = await ctx.supabase
    .from("hub_nodes")
    .select("mesh_id, name, host, agents, repo_focus, models, last_seen")
    .eq("user_id", ctx.userId)
    .gte("last_seen", cutoff)
    .order("last_seen", { ascending: false });
  if (error) throw new Error(error.message);

  const cloudModels = PLATFORM_IDS.filter((p) => settings.enabledPlatforms.has(p)).map((p) => ({
    host: CLOUD_MESH_ID,
    model: `${p}/${DEFAULT_MODELS[p]}`,
    via: "cloud",
  }));
  const cloudNode = {
    mesh_id: CLOUD_MESH_ID,
    name: "RoboHeard Cloud",
    host: CLOUD_MESH_ID,
    agents: [],
    repo_focus: [],
    models: cloudModels,
    last_seen_s: 0,
  };

  const nodes = ((data ?? []) as Array<{ mesh_id: string; name: string; host: string; agents: unknown; repo_focus: unknown; models: unknown; last_seen: string }>).map((n) => ({
    mesh_id: n.mesh_id,
    name: n.name,
    host: n.host,
    agents: n.agents ?? [],
    repo_focus: n.repo_focus ?? [],
    models: n.models ?? [],
    last_seen_s: Math.max(0, Math.round((Date.now() - new Date(n.last_seen).getTime()) / 1000)),
  }));

  return { nodes: [cloudNode, ...nodes] };
}

async function toolHubAsk(ctx: AuthCtx, args: Record<string, unknown>, settings: McpSettings) {
  const meshId = String(args.mesh_id ?? "");
  const host = String(args.host ?? "");
  const model = String(args.model ?? "");
  const messages = Array.isArray(args.messages) ? (args.messages as Array<Record<string, unknown>>) : [];
  const timeoutMs = Math.min(600_000, Math.max(1_000, Number(args.timeout_ms ?? 120_000)));
  if (!meshId) throw new Error("mesh_id is required");
  if (!host) throw new Error("host is required");
  if (!model) throw new Error("model is required");
  if (messages.length === 0) throw new Error("messages must be a non-empty array");

  if (meshId === CLOUD_MESH_ID) {
    const [platform, ...rest] = model.split("/");
    const cloudModel = rest.join("/");
    if (!PLATFORM_IDS.includes(platform as PlatformId)) {
      throw new Error(`Cloud model must be '<platform>/<model>', got: ${model}`);
    }
    if (!settings.enabledPlatforms.has(platform as PlatformId)) {
      throw new Error(`Platform "${platform}" is disabled in your MCP settings.`);
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const prompt = String(lastUser?.content ?? messages[messages.length - 1]?.content ?? "");
    if (!prompt) throw new Error("messages must contain a user message with content");

    let status = "done";
    let reply: string | null = null;
    let errText: string | null = null;
    try {
      const out = await toolAskModel(ctx, {
        platform,
        prompt,
        ...(cloudModel ? { model: cloudModel } : {}),
      });
      reply = (out as { content: string }).content ?? "";
    } catch (e) {
      status = "error";
      errText = e instanceof Error ? e.message : String(e);
    }
    const { data, error } = await ctx.supabase
      .from("hub_model_jobs")
      .insert({
        user_id: ctx.userId,
        target_mesh_id: meshId,
        target_host: host,
        model,
        messages,
        status,
        reply,
        error: errText,
        timeout_ms: timeoutMs,
        created_by: "mcp",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to record job");
    return { job_id: (data as { id: string }).id };
  }

  // Remote node: queue for pickup on the node's next hub_sync.
  const { count } = await ctx.supabase
    .from("hub_model_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("status", "queued");
  if ((count ?? 0) >= MAX_QUEUED_JOBS_PER_USER) {
    throw new Error(`Too many queued mesh jobs (limit ${MAX_QUEUED_JOBS_PER_USER}). Wait for nodes to drain the queue.`);
  }

  const { data, error } = await ctx.supabase
    .from("hub_model_jobs")
    .insert({
      user_id: ctx.userId,
      target_mesh_id: meshId,
      target_host: host,
      model,
      messages,
      status: "queued",
      timeout_ms: timeoutMs,
      created_by: "mcp",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to queue job");
  return { job_id: (data as { id: string }).id };
}

async function toolHubJob(ctx: AuthCtx, args: Record<string, unknown>) {
  const jobId = String(args.job_id ?? "");
  if (!jobId) throw new Error("job_id is required");
  // Same sweep as hub_sync, so pollers see expiry even when no node is syncing.
  await sweepJobs(ctx);
  const { data, error } = await ctx.supabase
    .from("hub_model_jobs")
    .select("status, reply, error, created_at")
    .eq("id", jobId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Unknown job_id: ${jobId}`);
  const row = data as { status: string; reply: string | null; error: string | null; created_at: string };
  return {
    status: row.status,
    ...(row.reply != null ? { reply: row.reply } : {}),
    ...(row.error != null ? { error: row.error } : {}),
    age_s: Math.max(0, Math.round((Date.now() - new Date(row.created_at).getTime()) / 1000)),
  };
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
      serverInfo: { name: "roboheard-mcp", version: "0.3.0" },
      instructions:
        "RoboHeard MCP — multi-model orchestration + mesh hub. Discovery: call list_models first. Single-model: ask_model. Web facts: web_search. Orchestrated (multi-model) reasoning: prefer the conductor_* family — conductor_route (plan only), conductor_compare (raw perspectives), conductor_ask (routed + synthesized answer), conductor_debate (multi-round critique loop). Mesh hub for ConductorAI fleets: hub_register then hub_sync on a loop (presence + messages + job pickup), hub_presence to see nodes and their local Ollama models, hub_send/hub_messages to coordinate, hub_ask + hub_job to run a model on a node (or on RoboHeard Cloud via mesh_id 'roboheard'). All cloud calls consume the user's RoboHeard tokens.",
    });
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") return null;
  if (method === "ping") return respond({});
  if (method === "tools/list") {
    if (!ctx) return respond({ tools: TOOLS });
    const settings = await loadMcpSettings(ctx);
    return respond({ tools: TOOLS.filter((t) => HUB_TOOL_NAMES.has(t.name) || settings.enabledTools.has(t.name)) });
  }

  if (method === "tools/call") {
    if (!ctx) return err(-32001, "Unauthorized: missing or invalid Bearer token");
    const name = params?.name as string;
    const args = { ...((params?.arguments as Record<string, unknown>) ?? {}) };
    try {
      const settings = await loadMcpSettings(ctx);
      // Mesh hub tools are transport plumbing for ConductorAI nodes: always available.
      if (!HUB_TOOL_NAMES.has(name) && !settings.enabledTools.has(name)) {
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
        case "list_chats":         out = await toolListChats(ctx, args); break;
        case "get_chat":           out = await toolGetChat(ctx, args); break;
        case "search_messages":    out = await toolSearchMessages(ctx, args); break;

        case "ask_model":          out = await toolAskModel(ctx, args); break;
        case "web_search":         out = await toolWebSearch(ctx, args); break;
        case "conductor_ask":
        case "ask_conductor":      out = await toolAskConductor(ctx, args); break;
        case "conductor_debate":
        case "iterate":            out = await toolIterate(ctx, args); break;
        case "conductor_route":    out = await toolConductorRoute(ctx, args); break;
        case "conductor_compare":  out = await toolConductorCompare(ctx, args); break;

        case "hub_register":       out = await toolHubRegister(ctx, args); break;
        case "hub_sync":           out = await toolHubSync(ctx, args); break;
        case "hub_send":           out = await toolHubSend(ctx, args); break;
        case "hub_messages":       out = await toolHubMessages(ctx, args); break;
        case "hub_presence":       out = await toolHubPresence(ctx, settings); break;
        case "hub_ask":            out = await toolHubAsk(ctx, args, settings); break;
        case "hub_job":            out = await toolHubJob(ctx, args); break;

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
