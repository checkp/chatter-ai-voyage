import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { runtimeEnv } from "../supabase";
import { guard, errorResult, jsonResult } from "../runtime";

export default defineTool({
  name: "web_search",
  title: "Live web search with citations",
  description:
    "Live web search grounded in real-time results with numbered source citations, powered by Perplexity Sonar. Returns { answer, citations: [{index, url, title}], model, query }. Use for time-sensitive facts, library changelogs, docs lookups, and anything training data may not cover. Always cite the returned sources.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Search query."),
    recency: z
      .enum(["day", "week", "month", "year"])
      .optional()
      .describe("Only include results from the last day/week/month/year."),
    mode: z.enum(["web", "academic", "sec"]).optional().describe("Search corpus. Defaults to web."),
    domains: z
      .array(z.string())
      .optional()
      .describe("Optional allow-list of domains (e.g. ['docs.python.org']). Prefix with '-' to exclude."),
    max_results: z.number().int().min(1).max(20).optional().describe("Approximate max sources to consider (default 8)."),
    model: z
      .enum(["sonar", "sonar-pro", "sonar-reasoning", "sonar-reasoning-pro"])
      .optional()
      .describe("Perplexity model. Defaults to your configured web-search model."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ query, recency, mode, domains, max_results, model }, ctx) => {
    const g = await guard(ctx, "web_search");
    if (!g.ok) return g.result;

    const key = runtimeEnv("PERPLEXITY_API_KEY");
    if (!key) return errorResult("Web search unavailable: PERPLEXITY_API_KEY is not configured on the server.");

    const chosenModel = model ?? g.settings.defaultWebSearchModel;
    const searchMode = mode ?? "web";
    const maxResults = max_results ?? 8;

    const body: Record<string, unknown> = {
      model: chosenModel,
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant. Answer the user's query concisely using ONLY the retrieved web sources. Use inline numeric citations like [1], [2] tied to the citations array. Prefer authoritative and recent sources. If sources conflict, say so.",
        },
        { role: "user", content: query },
      ],
      return_related_questions: false,
      max_tokens: 1500,
      web_search_options: {
        search_context_size: maxResults >= 12 ? "high" : maxResults >= 6 ? "medium" : "low",
      },
    };
    if (recency) body.search_recency_filter = recency;
    if (searchMode !== "web") body.search_mode = searchMode;
    if (domains && domains.length > 0) body.search_domain_filter = domains.slice(0, 20);

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      return errorResult(`Perplexity ${res.status}: ${errText.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      citations?: Array<string | { url?: string; title?: string }>;
      search_results?: Array<string | { url?: string; title?: string }>;
      usage?: unknown;
    };
    const answer = String(data.choices?.[0]?.message?.content ?? "");
    const raw = data.citations ?? data.search_results ?? [];
    const citations = raw
      .map((c, i) => {
        const url = typeof c === "string" ? c : (c?.url ?? "");
        const title = typeof c === "string" ? undefined : c?.title;
        return { index: i + 1, url, ...(title ? { title } : {}) };
      })
      .filter((c) => c.url);

    return jsonResult({
      query,
      model: chosenModel,
      answer,
      citations,
      search_mode: searchMode,
      recency: recency ?? null,
    });
  },
});
