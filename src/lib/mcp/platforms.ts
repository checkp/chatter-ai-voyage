/** Shared platform catalog for the MCP server. */

export const PLATFORM_IDS = [
  "openai",
  "anthropic",
  "google",
  "grok",
  "deepseek",
  "perplexity",
  "mistral",
  "qwen",
  "nvidia",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export const PLATFORM_TO_FN: Record<PlatformId, string> = {
  openai: "openai-chat",
  anthropic: "claude-chat",
  google: "gemini-chat",
  grok: "grok-chat",
  deepseek: "deepseek-chat",
  perplexity: "perplexity-chat",
  mistral: "mistral-chat",
  qwen: "qwen-chat",
  nvidia: "nvidia-chat",
};

export const DEFAULT_MODELS: Record<PlatformId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
  google: "gemini-2.0-flash",
  grok: "grok-2-1212",
  deepseek: "deepseek-chat",
  perplexity: "sonar-pro",
  mistral: "mistral-small-latest",
  qwen: "qwen-plus",
  nvidia: "nvidia/nemotron-3-nano-30b-a3b",
};

export const CAPABILITY_MATRIX: Record<PlatformId, Record<string, boolean>> = {
  openai: { think: true, search: true, deep_research: true, code_exec: true },
  anthropic: { think: true, search: true, deep_research: true, code_exec: true },
  google: { think: true, search: true, deep_research: true, code_exec: true },
  grok: { think: true, search: true, deep_research: true, code_exec: false },
  deepseek: { think: true, search: false, deep_research: true, code_exec: false },
  perplexity: { think: true, search: true, deep_research: true, code_exec: false },
  mistral: { think: false, search: false, deep_research: false, code_exec: false },
  qwen: { think: false, search: false, deep_research: false, code_exec: false },
  nvidia: { think: true, search: false, deep_research: false, code_exec: false },
};

/** Default panel: 4 frontier models other than the conductor itself. */
export function resolvePanel(conductor: PlatformId, include?: string[]): PlatformId[] {
  const requested = (include ?? []).filter((p): p is PlatformId =>
    (PLATFORM_IDS as readonly string[]).includes(p),
  );
  if (requested.length > 0) return requested;
  return PLATFORM_IDS.filter((p) => p !== conductor).slice(0, 4) as PlatformId[];
}
