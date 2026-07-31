import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_chat",
  title: "Get chat messages",
  description:
    "Read the messages of one of the signed-in user's conversations, including which AI platform produced each reply.",
  inputSchema: {
    chat_id: z.string().uuid().describe("The conversation id, as returned by list_chats."),
    limit: z.number().int().min(1).max(200).optional().describe("How many messages to return (default 50, newest last)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ chat_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender, platform, content, created_at")
      .eq("conversation_id", chat_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const messages = (data ?? []).slice().reverse();
    if (messages.length === 0) {
      return {
        content: [{ type: "text", text: "No messages found for that conversation (or it isn't yours)." }],
        structuredContent: { messages: [] },
      };
    }
    const text = messages
      .map((m) => `[${m.sender}${m.platform ? `/${m.platform}` : ""}] ${m.content}`)
      .join("\n\n");
    return { content: [{ type: "text", text }], structuredContent: { messages } };
  },
});
