import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import { CAPABILITY_MATRIX, DEFAULT_MODELS, PLATFORM_IDS } from "../platforms";
import { guard, jsonResult } from "../runtime";

export default defineTool({
  name: "list_models",
  title: "List available models",
  description:
    "List RoboHeard's AI platforms (OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Perplexity, Qwen, NVIDIA), their model ids and cost tiers, and which advanced capabilities (think, search, deep_research, code_exec) each supports. Call first to discover what to route to.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const g = await guard(ctx, "list_models");
    if (g.error) return g.error;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("model_pricing")
      .select("platform, model_id, cost_tier, tokens_per_message")
      .order("platform", { ascending: true })
      .order("model_id", { ascending: true });
    if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };

    const rows = (data ?? []) as Array<{
      platform: string;
      model_id: string;
      cost_tier: string;
      tokens_per_message: number;
    }>;
    const byPlatform: Record<string, typeof rows> = {};
    for (const row of rows) (byPlatform[row.platform] ??= []).push(row);

    const platforms = PLATFORM_IDS.filter((id) => g.settings.enabledPlatforms.includes(id)).map((id) => ({
      id,
      default_model: DEFAULT_MODELS[id],
      capabilities: CAPABILITY_MATRIX[id],
      models: (byPlatform[id] ?? []).map((m) => ({
        model_id: m.model_id,
        cost_tier: m.cost_tier,
        tokens_per_message: m.tokens_per_message,
      })),
    }));

    return jsonResult({ platforms, enabled_tools: g.settings.enabledTools });
  },
});
