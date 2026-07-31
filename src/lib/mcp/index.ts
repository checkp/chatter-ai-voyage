import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listModelsTool from "./tools/list-models";
import listChatsTool from "./tools/list-chats";
import getChatTool from "./tools/get-chat";
import searchMessagesTool from "./tools/search-messages";
import askModelTool from "./tools/ask-model";
import webSearchTool from "./tools/web-search";
import {
  conductorAskTool,
  conductorRouteTool,
  conductorCompareTool,
  conductorDebateTool,
} from "./tools/conductor";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "chatter-ai-voyage",
  title: "chatter-ai-voyage",
  version: "0.2.0",
  instructions:
    "RoboHeard MCP — multi-model orchestration. Discovery: call list_models first. Single model: ask_model (supports think/search/deep_research/code_exec capabilities). Live web facts with citations: web_search. Orchestrated reasoning: conductor_route (plan only), conductor_compare (raw side-by-side perspectives), conductor_ask (routed + synthesized answer), conductor_debate (multi-round critique loop). History: list_chats, get_chat, search_messages. Every call runs as the signed-in user, spends their RoboHeard tokens, and appears in their RoboHeard sidebar. Tool availability, platforms, and defaults follow the user's MCP settings at /mcp.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listModelsTool,
    listChatsTool,
    getChatTool,
    searchMessagesTool,
    askModelTool,
    webSearchTool,
    conductorRouteTool,
    conductorCompareTool,
    conductorAskTool,
    conductorDebateTool,
  ],
});
