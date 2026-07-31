import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser, callChatFunction } from "./supabase";
import { DEFAULT_MODELS, PLATFORM_IDS, PLATFORM_TO_FN, type PlatformId } from "./platforms";

/** Per-user MCP configuration (shared with the /mcp settings UI). */
export interface McpSettings {
  enabledTools: string[];
  enabledPlatforms: PlatformId[];
  defaultConductorPlatform: PlatformId;
  defaultWebSearchModel: string;
}

export const ALL_TOOL_NAMES = [
  "list_models",
  "list_chats",
  "get_chat",
  "search_messages",
  "ask_model",
  "web_search",
  "conductor_ask",
  "conductor_route",
  "conductor_compare",
  "conductor_debate",
] as const;

const DEFAULT_SETTINGS: McpSettings = {
  enabledTools: [...ALL_TOOL_NAMES],
  enabledPlatforms: [...PLATFORM_IDS],
  defaultConductorPlatform: "openai",
  defaultWebSearchModel: "sonar-pro",
};

export async function loadMcpSettings(ctx: ToolContext): Promise<McpSettings> {
  const supabase = supabaseForUser(ctx);
  const { data } = await supabase
    .from("user_mcp_settings")
    .select("enabled_tools, enabled_platforms, default_conductor_platform, default_web_search_model")
    .eq("user_id", ctx.getUserId())
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  const row = data as {
    enabled_tools: string[] | null;
    enabled_platforms: string[] | null;
    default_conductor_platform: string | null;
    default_web_search_model: string | null;
  };
  return {
    enabledTools: row.enabled_tools ?? [...ALL_TOOL_NAMES],
    enabledPlatforms: (row.enabled_platforms ?? [...PLATFORM_IDS]) as PlatformId[],
    defaultConductorPlatform: (row.default_conductor_platform as PlatformId) ?? "openai",
    defaultWebSearchModel: row.default_web_search_model ?? "sonar-pro",
  };
}

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function jsonResult(payload: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

/**
 * Shared entry guard: verifies auth and that the tool is enabled in the
 * signed-in user's MCP settings. Returns `error` when the call is blocked.
 */
export async function guard(
  ctx: ToolContext,
  toolName: string,
): Promise<{ error: ToolResult | null; settings: McpSettings }> {
  if (!ctx.isAuthenticated()) {
    return { error: errorResult("Not authenticated"), settings: DEFAULT_SETTINGS };
  }
  const settings = await loadMcpSettings(ctx);
  if (!settings.enabledTools.includes(toolName)) {
    return {
      error: errorResult(`Tool "${toolName}" is disabled in your MCP settings. Enable it at /mcp in RoboHeard.`),
      settings,
    };
  }
  return { error: null, settings };
}


export function assertPlatformAllowed(settings: McpSettings, platform: string): void {
  if (!settings.enabledPlatforms.includes(platform as PlatformId)) {
    throw new Error(`Platform "${platform}" is disabled in your MCP settings.`);
  }
}

export function allowedPanel(settings: McpSettings, conductor: PlatformId, include?: string[]): PlatformId[] {
  const requested = (include ?? []).filter((p): p is PlatformId =>
    settings.enabledPlatforms.includes(p as PlatformId),
  );
  if (requested.length > 0) return requested;
  return settings.enabledPlatforms.filter((p) => p !== conductor).slice(0, 4);
}

// ─── Conversation persistence (chats land in the user's RoboHeard sidebar) ───

export async function ensureConversation(
  ctx: ToolContext,
  opts: { conversationId?: string; title: string; chatMode: string; conductorPlatform?: string },
): Promise<string> {
  if (opts.conversationId) return opts.conversationId;
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: ctx.getUserId(),
      title: opts.title,
      chat_mode: opts.chatMode,
      conductor_platform: opts.conductorPlatform ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to create conversation: ${error?.message}`);
  return data.id as string;
}

export async function saveMessage(
  ctx: ToolContext,
  conversationId: string,
  sender: "user" | "ai",
  content: string,
  platform?: string,
): Promise<void> {
  const supabase = supabaseForUser(ctx);
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender,
    content,
    platform: platform ?? null,
  });
}

export async function loadHistory(
  ctx: ToolContext,
  conversationId: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const supabase = supabaseForUser(ctx);
  const { data } = await supabase
    .from("messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as Array<{ sender: string; content: string }>).map((m) => ({
    role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));
}

// ─── Conductor engine (ported from the legacy /mcp function) ────────────────

export interface ConductorRound {
  decision: string;
  agent_responses: Array<{ platform: PlatformId; content: string }>;
  synthesis: string;
}

export async function runConductorRound(
  ctx: ToolContext,
  opts: { conversationId: string; prompt: string; conductorPlatform: PlatformId; panel: PlatformId[] },
): Promise<ConductorRound> {
  const { conversationId, prompt, conductorPlatform, panel } = opts;

  const decisionPrompt = `You are the Conductor coordinating multiple AI agents.
User message: "${prompt}"
Available agents: ${panel.join(", ")}
Provide a brief coordination plan, then respond. Add [COORDINATION_NEEDED: YES] to trigger multi-agent fan-out, or [COORDINATION_NEEDED: NO] to answer solo.`;

  const decision = await callChatFunction(ctx, PLATFORM_TO_FN[conductorPlatform], {
    messages: [{ role: "user", content: decisionPrompt }],
    model: DEFAULT_MODELS[conductorPlatform],
  });
  await saveMessage(ctx, conversationId, "ai", decision, conductorPlatform);

  const needsFanout = !/\[COORDINATION_NEEDED:\s*NO\s*\]/i.test(decision);
  if (!needsFanout || panel.length === 0) {
    return { decision, agent_responses: [], synthesis: decision };
  }

  const coordinationPrompt = `The Conductor asked for your perspective on: "${prompt}"

Conductor's plan: ${decision}

Provide your specialized angle.`;

  const settled = await Promise.allSettled(
    panel.map(async (p) => ({
      platform: p,
      content: await callChatFunction(ctx, PLATFORM_TO_FN[p], {
        messages: [{ role: "user", content: coordinationPrompt }],
        model: DEFAULT_MODELS[p],
      }),
    })),
  );
  const agentResponses = settled
    .filter((r): r is PromiseFulfilledResult<{ platform: PlatformId; content: string }> => r.status === "fulfilled")
    .map((r) => r.value);
  for (const ar of agentResponses) {
    await saveMessage(ctx, conversationId, "ai", ar.content, ar.platform);
  }
  if (agentResponses.length === 0) return { decision, agent_responses: [], synthesis: decision };

  const synthesisPrompt = `Synthesize these agent responses into one coherent answer for the user.

Original question: "${prompt}"

${agentResponses.map((a) => `[${a.platform}]:\n${a.content}`).join("\n\n")}

Provide the best synthesized answer.`;
  const synthesis = await callChatFunction(ctx, PLATFORM_TO_FN[conductorPlatform], {
    messages: [{ role: "user", content: synthesisPrompt }],
    model: DEFAULT_MODELS[conductorPlatform],
  });
  await saveMessage(ctx, conversationId, "ai", synthesis, conductorPlatform);
  return { decision, agent_responses: agentResponses, synthesis };
}
