import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listModelsTool from "./tools/list-models";
import listChatsTool from "./tools/list-chats";
import getChatTool from "./tools/get-chat";
import searchMessagesTool from "./tools/search-messages";
import askModelTool from "./tools/ask-model";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "chatter-ai-voyage",
  title: "chatter-ai-voyage",
  version: "0.1.0",
  instructions:
    "Tools for RoboHeard, a multi-model AI orchestrator. Use list_models to see available providers and model ids, list_chats/get_chat/search_messages to read the signed-in user's conversation history, and ask_model to route a prompt to a specific provider (this consumes the user's tokens).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listModelsTool, listChatsTool, getChatTool, searchMessagesTool, askModelTool],
});
