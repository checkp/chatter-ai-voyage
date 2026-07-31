import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callChatFunction } from "../supabase";
import { DEFAULT_MODELS, PLATFORM_IDS, PLATFORM_TO_FN, type PlatformId } from "../platforms";
import {
  allowedPanel,
  ensureConversation,
  errorResult,
  guard,
  jsonResult,
  runConductorRound,
  saveMessage,
} from "../runtime";

const platformEnum = z.enum(PLATFORM_IDS);

export const conductorAskTool = defineTool({
  name: "conductor_ask",
  title: "Conductor — orchestrated multi-model answer",
  description:
    "Run RoboHeard's Conductor: one model routes the prompt across a panel of frontier AIs, collects their perspectives, and synthesizes a single best answer. Prefer this over ask_model when the question is ambiguous, high-stakes, or spans multiple domains. Persists to chat history.",
  inputSchema: {
    prompt: z.string().trim().min(1).describe("The user prompt to route across the panel."),
    conductor_platform: platformEnum.optional().describe("Which model plays Conductor. Defaults to your configured one."),
    include_platforms: z.array(platformEnum).optional().describe("Restrict the panel. Defaults to 4 frontier models."),
    conversation_id: z.string().uuid().optional().describe("Optional existing conversation to continue."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ prompt, conductor_platform, include_platforms, conversation_id }, ctx) => {
    const g = await guard(ctx, "conductor_ask");
    if (g.error) return g.error;
    const conductor = (conductor_platform ?? g.settings.defaultConductorPlatform) as PlatformId;
    const panel = allowedPanel(g.settings, conductor, include_platforms);
    try {
      const conversationId = await ensureConversation(ctx, {
        conversationId: conversation_id,
        title: `MCP: ${prompt.slice(0, 50)}`,
        chatMode: "conductor",
        conductorPlatform: conductor,
      });
      await saveMessage(ctx, conversationId, "user", prompt);
      const round = await runConductorRound(ctx, { conversationId, prompt, conductorPlatform: conductor, panel });
      return jsonResult({ conversation_id: conversationId, conductor_platform: conductor, panel, ...round });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});

export const conductorRouteTool = defineTool({
  name: "conductor_route",
  title: "Conductor — routing plan only",
  description:
    "Ask the Conductor which agents SHOULD answer a prompt and why, without fanning out. Cheap — use to preview a plan before spending tokens with conductor_ask or conductor_debate.",
  inputSchema: {
    prompt: z.string().trim().min(1).describe("The prompt to plan for."),
    conductor_platform: platformEnum.optional().describe("Which model plans the route."),
    include_platforms: z.array(platformEnum).optional().describe("Candidate agents to choose from."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ prompt, conductor_platform, include_platforms }, ctx) => {
    const g = await guard(ctx, "conductor_route");
    if (g.error) return g.error;
    const conductor = (conductor_platform ?? g.settings.defaultConductorPlatform) as PlatformId;
    const panel = allowedPanel(g.settings, conductor, include_platforms);
    const planPrompt = `You are the RoboHeard Conductor. Do NOT answer the user's question.
Instead, return a JSON routing plan with fields:
  { "strategy": "solo"|"fanout"|"debate", "agents": string[], "reasoning": string }
where "agents" is a subset of: ${panel.join(", ")}.
User prompt: "${prompt}"
Reply with ONLY the JSON object.`;
    try {
      const raw = await callChatFunction(ctx, PLATFORM_TO_FN[conductor], {
        messages: [{ role: "user", content: planPrompt }],
        model: DEFAULT_MODELS[conductor],
      });
      let plan: unknown = raw;
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          plan = JSON.parse(match[0]);
        } catch {
          // keep the raw text
        }
      }
      return jsonResult({ conductor_platform: conductor, panel, plan });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});

export const conductorCompareTool = defineTool({
  name: "conductor_compare",
  title: "Conductor — raw multi-model perspectives",
  description:
    "Fan the prompt out to the panel and return each agent's raw answer side-by-side, WITHOUT a synthesis step. Use to compare or benchmark models yourself. Cheaper than conductor_ask.",
  inputSchema: {
    prompt: z.string().trim().min(1).describe("The prompt to send to every agent."),
    include_platforms: z.array(platformEnum).optional().describe("Which agents to compare."),
    conversation_id: z.string().uuid().optional().describe("Optional existing conversation to continue."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ prompt, include_platforms, conversation_id }, ctx) => {
    const g = await guard(ctx, "conductor_compare");
    if (g.error) return g.error;
    const panel = allowedPanel(g.settings, g.settings.defaultConductorPlatform, include_platforms);
    if (panel.length === 0) return errorResult("No platforms are enabled in your MCP settings.");
    try {
      const conversationId = await ensureConversation(ctx, {
        conversationId: conversation_id,
        title: `MCP compare: ${prompt.slice(0, 40)}`,
        chatMode: "side-by-side",
      });
      await saveMessage(ctx, conversationId, "user", prompt);
      const settled = await Promise.allSettled(
        panel.map(async (p) => ({
          platform: p,
          model: DEFAULT_MODELS[p],
          content: await callChatFunction(ctx, PLATFORM_TO_FN[p], {
            messages: [{ role: "user", content: prompt }],
            model: DEFAULT_MODELS[p],
          }),
        })),
      );
      const perspectives = settled.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : {
              platform: panel[i],
              model: DEFAULT_MODELS[panel[i]],
              content: "",
              error: r.reason instanceof Error ? r.reason.message : String(r.reason),
            },
      );
      for (const p of perspectives) {
        if (p.content) await saveMessage(ctx, conversationId, "ai", p.content, p.platform);
      }
      return jsonResult({ conversation_id: conversationId, perspectives });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});

export const conductorDebateTool = defineTool({
  name: "conductor_debate",
  title: "Conductor — multi-round critique loop",
  description:
    "Run the Conductor N times in a critique-and-improve loop, ending with a final synthesized answer. Use for hard reasoning, code review, or architecture decisions. Slower and consumes more tokens.",
  inputSchema: {
    prompt: z.string().trim().min(1).describe("The problem to work through."),
    iterations: z.number().int().min(2).max(5).optional().describe("Number of rounds (default 3)."),
    conductor_platform: platformEnum.optional().describe("Which model plays Conductor."),
    include_platforms: z.array(platformEnum).optional().describe("Restrict the panel."),
    conversation_id: z.string().uuid().optional().describe("Optional existing conversation to continue."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ prompt, iterations, conductor_platform, include_platforms, conversation_id }, ctx) => {
    const g = await guard(ctx, "conductor_debate");
    if (g.error) return g.error;
    const rounds = iterations ?? 3;
    const conductor = (conductor_platform ?? g.settings.defaultConductorPlatform) as PlatformId;
    const panel = allowedPanel(g.settings, conductor, include_platforms);
    try {
      const conversationId = await ensureConversation(ctx, {
        conversationId: conversation_id,
        title: `MCP debate: ${prompt.slice(0, 40)}`,
        chatMode: "conductor",
        conductorPlatform: conductor,
      });
      await saveMessage(ctx, conversationId, "user", prompt);
      const results: Array<{ iteration: number; synthesis: string }> = [];
      let current = prompt;
      for (let i = 1; i <= rounds; i++) {
        const isFinal = i === rounds;
        const framed =
          i === 1
            ? current
            : `Iteration ${i} of ${rounds}${isFinal ? " (FINAL)" : ""}. Prior synthesis:\n\n${current}\n\nCritique it, resolve gaps, and produce ${isFinal ? "the final answer" : "an improved answer"} to the original question: "${prompt}"`;
        const round = await runConductorRound(ctx, {
          conversationId,
          prompt: framed,
          conductorPlatform: conductor,
          panel,
        });
        results.push({ iteration: i, synthesis: round.synthesis });
        current = round.synthesis;
      }
      return jsonResult({
        conversation_id: conversationId,
        conductor_platform: conductor,
        panel,
        iterations: results,
        final: results[results.length - 1]?.synthesis ?? "",
      });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
