import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { guard } from "../runtime";

export default defineTool({
  name: "list_chats",
  title: "List chats",
  description: "List the signed-in user's most recent conversations, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many conversations to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const g = await guard(ctx, "list_chats");
    if (g.error) return g.error;
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, chat_mode, conductor_platform, updated_at, created_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const chats = data ?? [];
    const text = chats.length
      ? chats.map((c) => `${c.id} · ${c.title} [${c.chat_mode}] updated ${c.updated_at}`).join("\n")
      : "No conversations yet.";
    return { content: [{ type: "text", text }], structuredContent: { chats } };
  },
});
