import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { registerModelAdvancedLookup } from '@/lib/capabilities';

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  costTier: 'low' | 'medium' | 'high';
  capabilities: string[];
  speed: 'fast' | 'medium' | 'slow';
}

// ────────────────────────────────────────────────────────────────────────────
// Static metadata: enriches DB rows with name/description/capabilities/speed.
// The list of *available* models is sourced from `model_pricing` in Supabase.
// Anything in the DB without metadata here still appears with sensible defaults.
// ────────────────────────────────────────────────────────────────────────────

type AdvancedFlags = { think?: boolean; search?: boolean; deep_research?: boolean; code_exec?: boolean };
type Meta = Omit<ModelConfig, 'id' | 'costTier'> & { advanced?: AdvancedFlags };

const NONE: AdvancedFlags = { think: false, search: false, deep_research: false, code_exec: false };
const ALL: AdvancedFlags = { think: true, search: true, deep_research: true, code_exec: true };

const META: Record<string, Meta> = {
  // ── OpenAI (GPT-5.6 family is current; GPT-5 / GPT-4o are legacy) ──
  'gpt-5.6-sol':   { name: 'GPT-5.6 Sol',   description: 'Frontier model for the hardest reasoning and coding', maxTokens: 1050000, capabilities: ['text','vision','reasoning','coding','analysis'], speed: 'medium', advanced: ALL },
  'gpt-5.6-terra': { name: 'GPT-5.6 Terra', description: 'Balanced GPT-5.6 for everyday work',                  maxTokens: 400000,  capabilities: ['text','vision','reasoning','coding'],            speed: 'fast',   advanced: { think: true, search: true, deep_research: false, code_exec: true } },
  'gpt-5.6-luna':  { name: 'GPT-5.6 Luna',  description: 'Fast, low-cost GPT-5.6 for high-volume tasks',        maxTokens: 400000,  capabilities: ['text','vision','reasoning'],                     speed: 'fast',   advanced: { think: false, search: true, deep_research: false, code_exec: true } },
  'o3-deep-research': { name: 'o3 Deep Research', description: 'Dedicated multi-step research model',            maxTokens: 200000,  capabilities: ['text','vision','reasoning','search','analysis'],  speed: 'slow',   advanced: ALL },
  'gpt-4o-mini':  { name: 'GPT-4o Mini',  description: 'Legacy fast, cost-effective model',        maxTokens: 128000, capabilities: ['text','reasoning'],                    speed: 'fast',   advanced: { think: false, search: false, deep_research: false, code_exec: true } },
  'gpt-4o':       { name: 'GPT-4o',       description: 'Legacy flagship multimodal model',         maxTokens: 128000, capabilities: ['text','vision','reasoning','coding'],  speed: 'medium', advanced: { think: false, search: true, deep_research: false, code_exec: true } },
  'gpt-4-turbo':  { name: 'GPT-4 Turbo',  description: 'Legacy previous-generation flagship',      maxTokens: 128000, capabilities: ['text','reasoning','coding'],           speed: 'medium', advanced: NONE },
  'gpt-5':        { name: 'GPT-5',        description: 'Legacy GPT-5 (retiring Dec 2026)',         maxTokens: 400000, capabilities: ['text','vision','reasoning','coding'], speed: 'medium', advanced: { think: true, search: true, deep_research: true, code_exec: true } },

  // ── Anthropic (Claude 5 family is current) ──
  'claude-fable-5':  { name: 'Claude Fable 5',  description: 'Most capable Claude for long-running agents', maxTokens: 1000000, capabilities: ['text','vision','reasoning','coding','analysis','creative'], speed: 'slow',   advanced: ALL },
  'claude-opus-5':   { name: 'Claude Opus 5',   description: 'Complex agentic coding and enterprise work',  maxTokens: 1000000, capabilities: ['text','vision','reasoning','coding','analysis'],            speed: 'medium', advanced: ALL },
  'claude-sonnet-5': { name: 'Claude Sonnet 5', description: 'Best Claude balance of speed and depth',      maxTokens: 1000000, capabilities: ['text','vision','reasoning','coding','analysis'],            speed: 'fast',   advanced: { think: true, search: true, deep_research: false, code_exec: true } },
  'claude-haiku-4-5':  { name: 'Claude Haiku 4.5',  description: 'Fastest Claude, near-frontier quality',  maxTokens: 200000, capabilities: ['text','vision','reasoning'],                                 speed: 'fast',   advanced: { think: true, search: true, deep_research: false, code_exec: true } },
  'claude-sonnet-4-20250514': { name: 'Claude Sonnet 4', description: 'Legacy balanced Claude', maxTokens: 200000, capabilities: ['text','vision','reasoning','coding','analysis'], speed: 'medium', advanced: { think: true, search: true, deep_research: false, code_exec: true } },
  'claude-opus-4-20250514':   { name: 'Claude Opus 4',   description: 'Legacy top-end Claude',  maxTokens: 200000, capabilities: ['text','vision','reasoning','coding','analysis','creative'], speed: 'slow', advanced: { think: true, search: true, deep_research: true, code_exec: true } },

  // ── DeepSeek (ids route to DeepSeek V4) ──
  'deepseek-chat':     { name: 'DeepSeek V4 Flash',  description: 'Fast agentic DeepSeek V4, hybrid thinking',  maxTokens: 1000000, capabilities: ['text','reasoning','coding'],      speed: 'fast',   advanced: { think: true, search: false, deep_research: false, code_exec: false } },
  'deepseek-reasoner': { name: 'DeepSeek V4 Reasoner', description: 'Chain-of-thought reasoning mode of V4',    maxTokens: 1000000, capabilities: ['text','reasoning'],               speed: 'medium', advanced: { think: true, search: false, deep_research: true,  code_exec: false } },
  'deepseek-v4-pro':   { name: 'DeepSeek V4 Pro',    description: 'Higher-capability DeepSeek V4 tier',         maxTokens: 1000000, capabilities: ['text','reasoning','coding'],      speed: 'medium', advanced: { think: true, search: false, deep_research: true,  code_exec: false } },
  'deepseek-coder':    { name: 'DeepSeek Coder',     description: 'Specialised coding model',                   maxTokens: 32000,   capabilities: ['coding','debugging','analysis'],  speed: 'fast',   advanced: NONE },

  // ── xAI Grok (4.x family; no native web search — tool calling only) ──
  'grok-4.5':                  { name: 'Grok 4.5',            description: 'xAI flagship with selectable reasoning effort', maxTokens: 500000,  capabilities: ['text','vision','reasoning','analysis'], speed: 'medium', advanced: { think: true, search: false, deep_research: false, code_exec: false } },
  'grok-4.3':                  { name: 'Grok 4.3',            description: 'Fast Grok with strong tool calling',            maxTokens: 1000000, capabilities: ['text','vision','reasoning'],            speed: 'fast',   advanced: { think: true, search: false, deep_research: false, code_exec: false } },
  'grok-4.20-0309-reasoning':  { name: 'Grok 4.20 Reasoning', description: 'Reasoning-tuned Grok 4.20',                     maxTokens: 1000000, capabilities: ['text','vision','reasoning','analysis'], speed: 'medium', advanced: { think: true, search: false, deep_research: false, code_exec: false } },
  'grok-code-fast-1':          { name: 'Grok Code Fast',      description: 'Cheap coding-optimised Grok',                   maxTokens: 256000,  capabilities: ['text','coding','reasoning'],            speed: 'fast',   advanced: { think: false, search: false, deep_research: false, code_exec: false } },
  'grok-4':       { name: 'Grok 4',       description: 'Legacy alias of the current Grok build', maxTokens: 256000, capabilities: ['text','vision','reasoning','analysis'], speed: 'medium', advanced: { think: true, search: false, deep_research: false, code_exec: false } },
  'grok-4-heavy': { name: 'Grok 4 Heavy', description: 'Legacy deep-reasoning Grok',             maxTokens: 256000, capabilities: ['text','reasoning','analysis'],          speed: 'slow',   advanced: { think: true, search: false, deep_research: false, code_exec: false } },
  'grok-3':       { name: 'Grok 3',       description: 'Legacy alias routed to Grok 4.3',        maxTokens: 128000, capabilities: ['text','reasoning'],                     speed: 'medium', advanced: { think: true, search: false, deep_research: false, code_exec: false } },
  'grok-3-mini':  { name: 'Grok 3 Mini',  description: 'Legacy small Grok alias',                maxTokens: 64000,  capabilities: ['text','reasoning'],                     speed: 'fast',   advanced: NONE },

  // ── Google Gemini (3.x is current) ──
  'gemini-3.6-flash':      { name: 'Gemini 3.6 Flash',      description: 'Latest Gemini — fast agentic multimodal',   maxTokens: 1000000, capabilities: ['text','vision','audio','reasoning','coding'], speed: 'fast',   advanced: ALL },
  'gemini-3.5-flash':      { name: 'Gemini 3.5 Flash',      description: 'Frontier agentic and coding Gemini',        maxTokens: 1000000, capabilities: ['text','vision','audio','reasoning','coding','analysis'], speed: 'fast', advanced: ALL },
  'gemini-3.5-flash-lite': { name: 'Gemini 3.5 Flash Lite', description: 'Fastest, cheapest Gemini 3.5',              maxTokens: 1000000, capabilities: ['text','vision','audio','reasoning'],          speed: 'fast',   advanced: { think: false, search: true, deep_research: false, code_exec: true } },
  'gemini-3.1-flash-lite': { name: 'Gemini 3.1 Flash Lite', description: 'Cost-efficient high-volume Gemini',         maxTokens: 1000000, capabilities: ['text','vision','audio','reasoning'],          speed: 'fast',   advanced: { think: false, search: true, deep_research: false, code_exec: true } },
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', description: 'Legacy fast Gemini',      maxTokens: 1000000, capabilities: ['text','reasoning','vision'],                     speed: 'fast',   advanced: { think: true, search: true, deep_research: false, code_exec: true } },
  'gemini-2.5-pro':   { name: 'Gemini 2.5 Pro',   description: 'Legacy advanced Gemini',  maxTokens: 1000000, capabilities: ['text','reasoning','vision','coding','analysis'], speed: 'medium', advanced: { think: true, search: true, deep_research: false, code_exec: true } },

  // ── Mistral ──
  'mistral-medium-3.5': { name: 'Mistral Medium 3.5', description: 'Mistral frontier multimodal agentic model', maxTokens: 128000, capabilities: ['text','vision','reasoning','coding','multilingual'], speed: 'medium', advanced: { think: true, search: false, deep_research: false, code_exec: true } },
  'mistral-small-4':    { name: 'Mistral Small 4',    description: 'Efficient hybrid reasoning Mistral',        maxTokens: 128000, capabilities: ['text','vision','reasoning','coding'],               speed: 'fast',   advanced: { think: true, search: false, deep_research: false, code_exec: true } },
  'mistral-large-3':    { name: 'Mistral Large 3',    description: 'Open-weight general-purpose Mistral',       maxTokens: 128000, capabilities: ['text','vision','reasoning','coding','multilingual'], speed: 'medium', advanced: { think: false, search: false, deep_research: false, code_exec: true } },
  'codestral-latest':   { name: 'Codestral',          description: 'Specialised coding model',                  maxTokens: 32000,  capabilities: ['coding','debugging','analysis'],                     speed: 'fast',   advanced: NONE },

  // ── Perplexity Sonar (search-native) ──
  'sonar':                { name: 'Sonar',               description: 'Fast lightweight grounded search',           maxTokens: 128000, capabilities: ['text','search','citations'],                          speed: 'fast',   advanced: { think: false, search: true, deep_research: false, code_exec: false } },
  'sonar-pro':            { name: 'Sonar Pro',           description: 'Advanced search for complex queries',        maxTokens: 128000, capabilities: ['text','reasoning','search','citations'],               speed: 'medium', advanced: { think: false, search: true, deep_research: false, code_exec: false } },
  'sonar-reasoning-pro':  { name: 'Sonar Reasoning Pro', description: 'Multi-step chain-of-thought with search',    maxTokens: 128000, capabilities: ['text','reasoning','search','citations','analysis'],    speed: 'slow',   advanced: { think: true, search: true, deep_research: false, code_exec: false } },
  'sonar-deep-research':  { name: 'Sonar Deep Research', description: 'Exhaustive multi-source research reports',   maxTokens: 128000, capabilities: ['text','reasoning','search','citations','analysis'],    speed: 'slow',   advanced: { think: true, search: true, deep_research: true, code_exec: false } },

  // ── Qwen (Alibaba DashScope) ──
  'qwen3.8-max':   { name: 'Qwen3.8 Max',   description: 'Alibaba flagship MoE, native vision-language', maxTokens: 1000000, capabilities: ['text','vision','reasoning','coding','multilingual'], speed: 'medium', advanced: { think: true, search: true, deep_research: false, code_exec: true } },
  'qwen3.6-plus':  { name: 'Qwen3.6 Plus',  description: 'Mid-tier Qwen with optional thinking',         maxTokens: 131072,  capabilities: ['text','reasoning','multilingual'],                  speed: 'fast',   advanced: { think: true, search: false, deep_research: false, code_exec: true } },
  'qwen3-vl-plus': { name: 'Qwen3 VL Plus', description: 'Qwen vision-language specialist',              maxTokens: 131072,  capabilities: ['text','vision','reasoning','multilingual'],         speed: 'medium', advanced: NONE },
  'qwen-turbo':    { name: 'Qwen Turbo',    description: 'Fast & cost-effective Qwen',                   maxTokens: 1000000, capabilities: ['text','multilingual'],                              speed: 'fast',   advanced: NONE },
  'qwen3-max':     { name: 'Qwen3 Max',     description: 'Legacy Qwen3 flagship',                        maxTokens: 32000,   capabilities: ['text','reasoning','coding','multilingual'],         speed: 'slow',   advanced: { think: true, search: false, deep_research: false, code_exec: false } },


  // NVIDIA-hosted NIMs (integrate.api.nvidia.com)
  'nvidia/nemotron-3-ultra-550b-a55b':          { name: 'Nemotron 3 Ultra 550B',    description: 'NVIDIA flagship MoE reasoning model',                   maxTokens: 131072, capabilities: ['text','reasoning','coding','analysis'],           speed: 'slow' },
  'nvidia/nemotron-3-super-120b-a12b':          { name: 'Nemotron 3 Super 120B',    description: 'Mid-tier Nemotron MoE, strong reasoning',               maxTokens: 131072, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'nvidia/nemotron-3-nano-30b-a3b':             { name: 'Nemotron Nano 3 30B',      description: 'Compact fast Nemotron MoE',                             maxTokens: 131072, capabilities: ['text','reasoning'],                                speed: 'fast' },
  'nvidia/llama-3.1-nemotron-ultra-253b-v1':    { name: 'Llama 3.1 Nemotron Ultra 253B', description: 'Llama-based NVIDIA reasoning tune',                maxTokens: 128000, capabilities: ['text','reasoning','coding','analysis'],           speed: 'slow' },
  'nvidia/llama-3.3-nemotron-super-49b-v1.5':   { name: 'Llama 3.3 Nemotron Super 49B', description: 'Compact strong reasoner',                            maxTokens: 128000, capabilities: ['text','reasoning'],                                speed: 'medium' },
  'deepseek-ai/deepseek-v4-pro':                { name: 'DeepSeek V4 Pro',          description: 'DeepSeek V4 flagship (via NVIDIA)',                     maxTokens: 128000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'deepseek-ai/deepseek-v4-flash':              { name: 'DeepSeek V4 Flash',        description: 'Fast DeepSeek V4 (via NVIDIA)',                         maxTokens: 128000, capabilities: ['text','reasoning'],                                speed: 'fast' },
  'mistralai/mistral-large-3-675b-instruct-2512': { name: 'Mistral Large 3 (675B)',  description: 'Mistral flagship 2512 (via NVIDIA)',                    maxTokens: 128000, capabilities: ['text','reasoning','coding','multilingual'],       speed: 'slow' },
  'mistralai/mistral-nemotron':                 { name: 'Mistral Nemotron',         description: 'NVIDIA-tuned Mistral',                                  maxTokens: 128000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'mistralai/mistral-medium-3.5-128b':          { name: 'Mistral Medium 3.5 (128B)', description: 'Mistral Medium 3.5 (via NVIDIA)',                       maxTokens: 128000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'qwen/qwen3.5-397b-a17b':                     { name: 'Qwen 3.5 (397B)',          description: 'Qwen 3.5 flagship MoE (via NVIDIA)',                     maxTokens: 128000, capabilities: ['text','reasoning','coding','multilingual'],       speed: 'slow' },
  'qwen/qwen3.5-122b-a10b':                     { name: 'Qwen 3.5 (122B)',          description: 'Qwen 3.5 mid MoE (via NVIDIA)',                          maxTokens: 128000, capabilities: ['text','reasoning','multilingual'],                speed: 'medium' },
  'qwen/qwen3-next-80b-a3b-instruct':           { name: 'Qwen3 Next 80B',           description: 'Qwen3 Next generation (via NVIDIA)',                     maxTokens: 128000, capabilities: ['text','reasoning','multilingual'],                speed: 'medium' },
  'moonshotai/kimi-k2.6':                       { name: 'Kimi K2.6',                description: 'Moonshot Kimi K2.6 (via NVIDIA)',                        maxTokens: 200000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'z-ai/glm-5.2':                               { name: 'GLM-5.2',                  description: 'Zhipu GLM-5.2 agentic (via NVIDIA)',                      maxTokens: 128000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'minimaxai/minimax-m3':                       { name: 'MiniMax M3',               description: 'MiniMax multimodal MoE, 1M context',                    maxTokens: 1000000, capabilities: ['text','vision','reasoning','coding'],             speed: 'medium' },
  'openai/gpt-oss-120b':                        { name: 'GPT-OSS 120B',             description: 'Open GPT weights (via NVIDIA)',                          maxTokens: 128000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'openai/gpt-oss-20b':                         { name: 'GPT-OSS 20B',              description: 'Small open GPT (via NVIDIA)',                            maxTokens: 128000, capabilities: ['text','reasoning'],                                speed: 'fast' },
  'meta/llama-4-maverick-17b-128e-instruct':    { name: 'Llama 4 Maverick 17B×128e', description: 'Llama 4 MoE (via NVIDIA)',                              maxTokens: 128000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'meta/llama-3.3-70b-instruct':                { name: 'Llama 3.3 70B',            description: 'Llama 3.3 flagship (via NVIDIA)',                        maxTokens: 128000, capabilities: ['text','reasoning','coding'],                       speed: 'medium' },
  'nvidia/nemotron-nano-12b-v2-vl':             { name: 'Nemotron Nano VL 12B',     description: 'Compact NVIDIA vision-language',                         maxTokens: 128000, capabilities: ['text','vision','reasoning'],                       speed: 'fast' },
  'nvidia/cosmos-reason2-8b':                   { name: 'Cosmos Reason 2 (8B)',     description: 'NVIDIA vision reasoning',                                maxTokens: 32000,  capabilities: ['text','vision','reasoning'],                       speed: 'fast' },
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1':    { name: 'Llama Nemotron Nano VL 8B', description: 'Small vision-language NVIDIA model',                     maxTokens: 128000, capabilities: ['text','vision','reasoning'],                       speed: 'fast' },
  'meta/llama-3.2-90b-vision-instruct':         { name: 'Llama 3.2 Vision 90B',     description: 'Large Llama vision (via NVIDIA)',                        maxTokens: 128000, capabilities: ['text','vision','reasoning'],                       speed: 'slow' },
  'meta/llama-3.2-11b-vision-instruct':         { name: 'Llama 3.2 Vision 11B',     description: 'Small Llama vision (via NVIDIA)',                        maxTokens: 128000, capabilities: ['text','vision','reasoning'],                       speed: 'fast' },
  'microsoft/phi-3-vision-128k-instruct':        { name: 'Phi-3 Vision 128k',         description: 'Microsoft compact multimodal',                           maxTokens: 128000, capabilities: ['text','vision','reasoning'],                       speed: 'fast' },
  'mistralai/codestral-22b-instruct-v0.1':      { name: 'Codestral 22B',            description: 'Mistral coding model (via NVIDIA)',                       maxTokens: 32000,  capabilities: ['coding','debugging','analysis'],                  speed: 'fast' },
  'writer/palmyra-med-70b-32k':                 { name: 'Palmyra Med 70B',          description: 'Medical-domain LLM (via NVIDIA)',                        maxTokens: 32000,  capabilities: ['text','reasoning','medical'],                     speed: 'medium' },
  'writer/palmyra-fin-70b-32k':                 { name: 'Palmyra Fin 70B',          description: 'Finance-domain LLM (via NVIDIA)',                        maxTokens: 32000,  capabilities: ['text','reasoning','finance'],                     speed: 'medium' },
  'writer/palmyra-creative-122b':               { name: 'Palmyra Creative 122B',    description: 'Creative writing LLM (via NVIDIA)',                      maxTokens: 32000,  capabilities: ['text','creative','reasoning'],                    speed: 'medium' },
};

// Chat-capable platforms only — image-only models like dall-e are ignored.
const CHAT_PLATFORMS = new Set(['openai','anthropic','deepseek','grok','google','mistral','perplexity','qwen','nvidia']);

// Excluded model ids (image / non-chat) even if present in pricing table.
const EXCLUDED_MODELS = new Set(['dall-e-2','dall-e-3','gpt-image-1']);

// Preferred default per platform when no DB hint exists.
const PREFERRED_DEFAULTS: Record<string, string> = {
  openai:     'gpt-5.6-terra',
  anthropic:  'claude-sonnet-5',
  deepseek:   'deepseek-chat',
  grok:       'grok-4.3',
  google:     'gemini-3.6-flash',
  mistral:    'mistral-medium-3.5',
  perplexity: 'sonar-pro',
  qwen:       'qwen3.8-max',
  nvidia:     'nvidia/nemotron-3-nano-30b-a3b',
};


// Mutable cache populated from DB.
export const AI_MODELS: Record<string, ModelConfig[]> = {
  openai: [], anthropic: [], deepseek: [], grok: [], google: [], mistral: [], perplexity: [], qwen: [], nvidia: [],
};

let loadPromise: Promise<void> | null = null;
let loaded = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(fn => { try { fn(); } catch {} });

const humanizeName = (id: string) => id.split(/[-_]/).map(s => s[0]?.toUpperCase() + s.slice(1)).join(' ');

const buildModelConfig = (row: { model_id: string; cost_tier: string | null }): ModelConfig => {
  const meta = META[row.model_id];
  const costTier = (row.cost_tier === 'low' || row.cost_tier === 'medium' || row.cost_tier === 'high')
    ? row.cost_tier
    : 'medium';
  return {
    id: row.model_id,
    name: meta?.name ?? humanizeName(row.model_id),
    description: meta?.description ?? 'AI model',
    maxTokens: meta?.maxTokens ?? 32000,
    costTier,
    capabilities: meta?.capabilities ?? ['text'],
    speed: meta?.speed ?? 'medium',
  };
};

export const loadAIModelsFromDB = async (): Promise<void> => {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('model_pricing')
        .select('platform, model_id, cost_tier')
        .order('platform', { ascending: true })
        .order('cost_tier', { ascending: true });

      if (error || !data) {
        console.error('Failed to load model_pricing:', error);
        return;
      }

      const next: Record<string, ModelConfig[]> = {
        openai: [], anthropic: [], deepseek: [], grok: [], google: [], mistral: [], perplexity: [], qwen: [], nvidia: [],
      };
      for (const row of data) {
        if (!CHAT_PLATFORMS.has(row.platform)) continue;
        if (EXCLUDED_MODELS.has(row.model_id)) continue;
        next[row.platform].push(buildModelConfig(row));
      }
      // Mutate exported cache in place so existing imports see updates.
      for (const p of Object.keys(next)) AI_MODELS[p] = next[p];
      loaded = true;
      notify();
    } catch (e) {
      console.error('loadAIModelsFromDB error', e);
    }
  })();
  return loadPromise;
};

export const getModelConfig = (platformId: string, modelId: string): ModelConfig | undefined => {
  return AI_MODELS[platformId]?.find(m => m.id === modelId);
};

/**
 * Capability lookup keyed off the static META map (so it works even before the
 * DB-backed model list has loaded). Returns true when the given model declares
 * the requested capability (e.g. "vision", "audio", "pdf").
 *
 * Falls back to a per-platform heuristic for unknown ids — keeps things sane
 * if the DB adds a new model before META is updated.
 */
export const modelSupports = (modelId: string | undefined, capability: string): boolean => {
  if (!modelId) return false;
  const meta = META[modelId];
  if (meta?.capabilities?.includes(capability)) return true;
  if (capability === 'vision') {
    // Best-effort heuristic for ids we don't yet have META for.
    const id = modelId.toLowerCase();
    if (/(vision|vl|gpt-4o|gpt-5|claude-(fable|opus|sonnet|haiku)|gemini|pixtral|mistral-(medium|small|large)-[34]|grok-4|qwen3\.8)/.test(id)) {
      return true;
    }
  }
  return false;
};

/**
 * Advanced capability flags (think / search / deep_research / code_exec) for a
 * model id, or undefined when the model has no metadata yet. Registered with
 * `@/lib/capabilities` so the UI can grey out toggles per selected model.
 */
export const getModelAdvancedCapabilities = (modelId: string): AdvancedFlags | undefined =>
  META[modelId]?.advanced;

registerModelAdvancedLookup(getModelAdvancedCapabilities);

/** Convenience: which providers can accept image attachments at all (any model). */
export const PLATFORM_VISION_DEFAULT_MODEL: Record<string, string> = {
  openai: 'gpt-5.6-terra',
  anthropic: 'claude-sonnet-5',
  google: 'gemini-3.6-flash',
  grok: 'grok-4.3',
  mistral: 'mistral-medium-3.5',
  qwen: 'qwen3-vl-plus',
  nvidia: 'nvidia/nemotron-nano-12b-v2-vl',
};


export const getDefaultModel = (platformId: string): string => {
  const models = AI_MODELS[platformId];
  const preferred = PREFERRED_DEFAULTS[platformId];
  if (models && models.length > 0) {
    if (preferred && models.some(m => m.id === preferred)) return preferred;
    // Prefer 'low' cost tier as default to be friendly to token balance.
    const cheap = models.find(m => m.costTier === 'low');
    return (cheap ?? models[0]).id;
  }
  return preferred ?? '';
};

/**
 * React hook — triggers a one-time DB load and re-renders when the cache updates.
 * Components using AI_MODELS / getDefaultModel can call this to stay in sync.
 */
export const useAIModels = (platformId?: string) => {
  const [, force] = useState(0);
  useEffect(() => {
    let mounted = true;
    if (!loaded) loadAIModelsFromDB();
    const listener = () => { if (mounted) force(n => n + 1); };
    listeners.add(listener);
    return () => { mounted = false; listeners.delete(listener); };
  }, []);
  return {
    loaded,
    models: platformId ? (AI_MODELS[platformId] ?? []) : AI_MODELS,
  };
};
