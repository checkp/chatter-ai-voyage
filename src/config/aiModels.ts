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
};

// Chat-capable platforms only — image-only models like dall-e are ignored.
const CHAT_PLATFORMS = new Set(['openai','anthropic','deepseek','grok','google','mistral','perplexity']);

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
};

// Mutable cache populated from DB.
export const AI_MODELS: Record<string, ModelConfig[]> = {
  openai: [], anthropic: [], deepseek: [], grok: [], google: [], mistral: [], perplexity: [],
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
        openai: [], anthropic: [], deepseek: [], grok: [], google: [], mistral: [], perplexity: [],
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
