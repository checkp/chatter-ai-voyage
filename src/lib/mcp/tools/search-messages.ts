import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { guard } from "../runtime";

export default defineTool({
  name: "search_messages",
  title: "Search messages",
  description: "Full-text-ish search across the signed-in user's chat messages, newest first.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Text to look for inside message content."),
    limit: z.number().int().min(1).max(50).optional().describe("How many matches to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const g = await guard(ctx, "search_messages");
    if (g.error) return g.error;

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender, platform, content, created_at")
      .ilike("content", `%${query.replace(/[%_]/g, "")}%`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const matches = data ?? [];
    const text = matches.length
      ? matches
          .map(
            (m) =>
              `${m.conversation_id} · [${m.sender}${m.platform ? `/${m.platform}` : ""}] ${m.content.slice(0, 300)}`,
          )
          .join("\n\n")
      : `No messages matching "${query}".`;
    return { content: [{ type: "text", text }], structuredContent: { matches } };
  },
});
