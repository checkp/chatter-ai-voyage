import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_models",
  title: "List models",
  description:
    "List the AI models available in this app, grouped by provider (OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Perplexity, Qwen, NVIDIA), with their token cost tier.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("model_pricing")
      .select("platform, model_id, cost_tier, tokens_per_message")
      .order("platform", { ascending: true })
      .order("model_id", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const models = data ?? [];
    const lines = models.map(
      (m) => `${m.platform} · ${m.model_id} (${m.cost_tier}, ~${m.tokens_per_message} tokens/message)`,
    );
    return {
      content: [{ type: "text", text: lines.join("\n") || "No models configured." }],
      structuredContent: { models },
    };
  },
});
