import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

type Meta = Omit<ModelConfig, 'id' | 'costTier'>;

const META: Record<string, Meta> = {
  // OpenAI
  'gpt-4o-mini':  { name: 'GPT-4o Mini',  description: 'Fast and cost-effective for everyday tasks', maxTokens: 128000, capabilities: ['text','reasoning'],                          speed: 'fast' },
  'gpt-4o':       { name: 'GPT-4o',       description: 'Flagship multimodal model',                  maxTokens: 128000, capabilities: ['text','vision','reasoning','coding'],        speed: 'medium' },
  'gpt-4-turbo':  { name: 'GPT-4 Turbo',  description: 'Previous-generation flagship',               maxTokens: 128000, capabilities: ['text','reasoning','coding'],                 speed: 'medium' },
  'gpt-5':        { name: 'ChatGPT 5',    description: 'Next-gen multimodal reasoning',              maxTokens: 200000, capabilities: ['text','vision','reasoning','coding'],        speed: 'medium' },

  // Anthropic
  'claude-haiku-4-5':  { name: 'Claude Haiku 4',  description: 'Fast and cost-effective Claude', maxTokens: 200000, capabilities: ['text','reasoning'],                       speed: 'fast' },
  'claude-sonnet-4-20250514': { name: 'Claude Sonnet 4', description: 'Balanced Claude with strong reasoning', maxTokens: 200000, capabilities: ['text','reasoning','coding','analysis'], speed: 'medium' },
  'claude-opus-4-20250514':   { name: 'Claude Opus 4',   description: 'Most powerful Claude for complex tasks', maxTokens: 200000, capabilities: ['text','reasoning','coding','analysis','creative'], speed: 'slow' },

  // DeepSeek
  'deepseek-chat':     { name: 'DeepSeek Chat',     description: 'General-purpose conversational model',     maxTokens: 32000, capabilities: ['text','reasoning','coding'],          speed: 'fast' },
  'deepseek-coder':    { name: 'DeepSeek Coder',    description: 'Specialised coding model',                 maxTokens: 32000, capabilities: ['coding','debugging','analysis'],     speed: 'fast' },
  'deepseek-reasoner': { name: 'DeepSeek Reasoner', description: 'Chain-of-thought reasoning model',          maxTokens: 64000, capabilities: ['text','reasoning'],                  speed: 'medium' },

  // Grok
  'grok-4':             { name: 'Grok 4',             description: 'Next-gen Grok with real-time capabilities', maxTokens: 200000, capabilities: ['text','reasoning','real-time','analysis'], speed: 'medium' },
  'grok-4-heavy':       { name: 'Grok 4 Heavy',       description: 'Most powerful Grok for deep reasoning',     maxTokens: 200000, capabilities: ['text','reasoning','real-time','analysis'], speed: 'slow' },
  'grok-3':             { name: 'Grok 3',             description: 'Previous-generation Grok',                  maxTokens: 128000, capabilities: ['text','reasoning','real-time'],       speed: 'medium' },
  'grok-3-mini':        { name: 'Grok 3 Mini',        description: 'Smaller, faster Grok 3',                    maxTokens: 64000,  capabilities: ['text','reasoning'],                  speed: 'fast' },
  'grok-3-fast':        { name: 'Grok 3 Fast',        description: 'Optimised for speed',                       maxTokens: 32000,  capabilities: ['text','reasoning'],                  speed: 'fast' },
  'grok-3-mini-fast':   { name: 'Grok 3 Mini Fast',   description: 'Ultra-fast lightweight model',              maxTokens: 16000,  capabilities: ['text'],                              speed: 'fast' },
  'grok-2-vision-1212': { name: 'Grok 2 Vision',      description: 'Previous generation with vision',           maxTokens: 64000,  capabilities: ['text','vision','reasoning'],         speed: 'medium' },
  'grok-2-1212':        { name: 'Grok 2',             description: 'Previous generation general model',          maxTokens: 64000,  capabilities: ['text','reasoning'],                  speed: 'medium' },

  // Google
  'gemini-2.5-flash':    { name: 'Gemini 2.5 Flash',    description: 'Fast and cost-effective Gemini',           maxTokens: 1000000, capabilities: ['text','reasoning','vision'],                speed: 'fast' },
  'gemini-2.5-pro':      { name: 'Gemini 2.5 Pro',      description: 'Advanced reasoning Gemini',                maxTokens: 1000000, capabilities: ['text','reasoning','vision','coding','analysis'], speed: 'medium' },
  'gemini-2.0-flash-exp':{ name: 'Gemini 2.0 Flash',    description: 'Experimental 2.0 Flash',                   maxTokens: 1000000, capabilities: ['text','reasoning','vision'],                speed: 'fast' },
  'gemini-1.5-flash':    { name: 'Gemini 1.5 Flash',    description: 'Previous-gen fast Gemini',                 maxTokens: 1000000, capabilities: ['text','reasoning','vision'],                speed: 'fast' },
  'gemini-1.5-pro':      { name: 'Gemini 1.5 Pro',      description: 'Previous-gen pro Gemini',                  maxTokens: 1000000, capabilities: ['text','reasoning','vision','coding'],       speed: 'medium' },

  // Mistral
  'mistral-large-latest':  { name: 'Mistral Large',  description: 'Most capable Mistral model',     maxTokens: 128000, capabilities: ['text','reasoning','coding','multilingual'], speed: 'medium' },
  'mistral-medium-latest': { name: 'Mistral Medium', description: 'Balanced model for general tasks', maxTokens: 128000, capabilities: ['text','reasoning','coding'],                speed: 'medium' },
  'mistral-small-latest':  { name: 'Mistral Small',  description: 'Fast and cost-effective Mistral',  maxTokens: 128000, capabilities: ['text','reasoning'],                         speed: 'fast' },
  'codestral-latest':      { name: 'Codestral',      description: 'Specialised coding model',         maxTokens: 32000,  capabilities: ['coding','debugging','analysis'],            speed: 'fast' },

  // Perplexity
  'sonar':               { name: 'Sonar',               description: 'Fast lightweight search',                    maxTokens: 128000, capabilities: ['text','search','citations'],          speed: 'fast' },
  'sonar-pro':           { name: 'Sonar Pro',           description: 'Multi-step reasoning with web search',       maxTokens: 128000, capabilities: ['text','reasoning','search','citations'], speed: 'medium' },
  'sonar-reasoning-pro': { name: 'Sonar Reasoning Pro', description: 'Advanced chain-of-thought with web search',  maxTokens: 128000, capabilities: ['text','reasoning','search','citations','analysis'], speed: 'slow' },

  // Qwen (Alibaba DashScope)
  'qwen-max':   { name: 'Qwen Max',   description: 'Most capable Qwen for complex tasks',  maxTokens: 32000,  capabilities: ['text','reasoning','coding','multilingual'], speed: 'slow' },
  'qwen-plus':  { name: 'Qwen Plus',  description: 'Balanced Qwen for everyday tasks',     maxTokens: 131072, capabilities: ['text','reasoning','multilingual'],          speed: 'medium' },
  'qwen-turbo': { name: 'Qwen Turbo', description: 'Fast & cost-effective Qwen',           maxTokens: 1000000,capabilities: ['text','multilingual'],                      speed: 'fast' },
  'qwen3-max':  { name: 'Qwen3 Max',  description: 'Latest flagship Qwen3 generation',     maxTokens: 32000,  capabilities: ['text','reasoning','coding','multilingual'], speed: 'slow' },

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
  'microsoft/phi-4-multimodal-instruct':        { name: 'Phi-4 Multimodal',         description: 'Microsoft compact multimodal',                           maxTokens: 128000, capabilities: ['text','vision','reasoning'],                       speed: 'fast' },
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
  openai:     'gpt-4o-mini',
  anthropic:  'claude-sonnet-4-20250514',
  deepseek:   'deepseek-chat',
  grok:       'grok-4',
  google:     'gemini-2.5-flash',
  mistral:    'mistral-large-latest',
  perplexity: 'sonar-pro',
  qwen:       'qwen-plus',
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
    if (/(vision|vl|gpt-4o|gpt-5|claude-(3|opus|sonnet|haiku)-(?!2)|gemini|pixtral|grok-4|grok-2-vision)/.test(id)) {
      return true;
    }
  }
  return false;
};

/** Convenience: which providers can accept image attachments at all (any model). */
export const PLATFORM_VISION_DEFAULT_MODEL: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-2.5-flash',
  grok: 'grok-2-vision-1212',
  mistral: 'pixtral-12b-2409',
  qwen: 'qwen-vl-max',
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
