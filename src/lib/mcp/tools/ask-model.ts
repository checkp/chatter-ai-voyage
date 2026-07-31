import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callChatFunction } from "../supabase";

const PLATFORM_TO_FN = {
  openai: "openai-chat",
  anthropic: "claude-chat",
  google: "gemini-chat",
  grok: "grok-chat",
  deepseek: "deepseek-chat",
  perplexity: "perplexity-chat",
  mistral: "mistral-chat",
  qwen: "qwen-chat",
  nvidia: "nvidia-chat",
} as const;

export default defineTool({
  name: "ask_model",
  title: "Ask a model",
  description:
    "Send a prompt to one of the app's AI providers and return its answer. Consumes the signed-in user's tokens. Use list_models to discover valid model ids.",
  inputSchema: {
    platform: z
      .enum(["openai", "anthropic", "google", "grok", "deepseek", "perplexity", "mistral", "qwen", "nvidia"])
      .describe("Which provider to route the prompt to."),
    prompt: z.string().trim().min(1).describe("The user prompt to send."),
    model: z.string().trim().min(1).optional().describe("Optional explicit model id; the provider default is used otherwise."),
    system: z.string().trim().min(1).optional().describe("Optional system instruction."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ platform, prompt, model, system }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const messages = [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt },
    ];
    try {
      const content = await callChatFunction(ctx, PLATFORM_TO_FN[platform], {
        messages,
        ...(model ? { model } : {}),
      });
      return { content: [{ type: "text", text: content }], structuredContent: { platform, model, content } };
    } catch (e) {
      return {
        content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
        isError: true,
      };
    }
  },
});
