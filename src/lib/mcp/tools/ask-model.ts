import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callChatFunction } from "../supabase";
import { DEFAULT_MODELS, PLATFORM_IDS, PLATFORM_TO_FN, type PlatformId } from "../platforms";
import {
  assertPlatformAllowed,
  ensureConversation,
  errorResult,
  guard,
  jsonResult,
  loadHistory,
  saveMessage,
} from "../runtime";

export default defineTool({
  name: "ask_model",
  title: "Ask a single AI model",
  description:
    "Send a prompt to ONE AI model through RoboHeard — fastest and cheapest path. Optionally enable advanced capabilities (think, search, deep_research, code_exec) and continue an existing conversation. Consumes the signed-in user's tokens and persists to chat history. Use list_models to discover valid model ids.",
  inputSchema: {
    platform: z.enum(PLATFORM_IDS).describe("Which provider to route the prompt to."),
    prompt: z.string().trim().min(1).describe("The user prompt to send."),
    model: z.string().trim().min(1).optional().describe("Optional explicit model id; the platform default is used otherwise."),
    system: z.string().trim().min(1).optional().describe("Optional system instruction."),
    capabilities: z
      .object({
        think: z.boolean().optional(),
        search: z.boolean().optional(),
        deep_research: z.boolean().optional(),
        code_exec: z.boolean().optional(),
      })
      .optional()
      .describe("Advanced capabilities to enable for supported models."),
    conversation_id: z.string().uuid().optional().describe("Optional existing RoboHeard conversation to continue."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ platform, prompt, model, system, capabilities, conversation_id }, ctx) => {
    const g = await guard(ctx, "ask_model");
    if (g.error) return g.error;
    try {
      assertPlatformAllowed(g.settings, platform);
      const chosenModel = model ?? DEFAULT_MODELS[platform as PlatformId];

      const conversationId = await ensureConversation(ctx, {
        conversationId: conversation_id,
        title: prompt.slice(0, 60),
        chatMode: "free",
      });
      const history = conversation_id ? await loadHistory(ctx, conversationId) : [];
      await saveMessage(ctx, conversationId, "user", prompt);

      const messages = [
        ...(system ? [{ role: "system", content: system }] : []),
        ...history,
        { role: "user", content: prompt },
      ];
      const content = await callChatFunction(ctx, PLATFORM_TO_FN[platform as PlatformId], {
        messages,
        model: chosenModel,
        ...(capabilities ? { capabilities } : {}),
      });
      await saveMessage(ctx, conversationId, "ai", content, platform);
      return jsonResult({ platform, model: chosenModel, conversation_id: conversationId, content });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
