import { describe, it, expect, beforeEach } from 'vitest';
import {
  ALL_CAPABILITY_KEYS,
  PLATFORM_CAPABILITY_SUPPORT,
  getSupportedCapabilities,
  isCapabilitySupported,
  resolveCapabilitiesForPlatform,
  parseConductorCapabilities,
  setActiveAgentModels,
  setAgentCapabilityDefaults,
  setPendingCapabilities,
  clearPendingCapabilities,
  setConductorCapabilityOverrides,
  clearConductorCapabilityOverrides,
  type CapabilityKey,
} from '@/lib/capabilities';
// Importing the model registry registers the per-model advanced lookup.
import { AI_MODELS, getModelAdvancedCapabilities, getModelConfig } from '@/config/aiModels';

const resetGlobals = () => {
  setActiveAgentModels({});
  setAgentCapabilityDefaults({});
  clearPendingCapabilities();
  setPendingCapabilities({});
  clearConductorCapabilityOverrides();
};

describe('capability mappings per model', () => {
  beforeEach(resetGlobals);

  it('exposes exactly the four known capability keys', () => {
    expect(ALL_CAPABILITY_KEYS).toEqual(['think', 'search', 'deep_research', 'code_exec']);
  });

  it('every chat platform has a full support matrix row', () => {
    for (const platform of Object.keys(PLATFORM_CAPABILITY_SUPPORT)) {
      for (const key of ALL_CAPABILITY_KEYS) {
        expect(typeof PLATFORM_CAPABILITY_SUPPORT[platform][key]).toBe('boolean');
      }
    }
  });

  it('per-model metadata wins over the platform matrix', () => {
    // deepseek-chat declares deep_research: false while the platform row allows it.
    expect(PLATFORM_CAPABILITY_SUPPORT.deepseek.deep_research).toBe(true);
    expect(getModelAdvancedCapabilities('deepseek-chat')?.deep_research).toBe(false);
    expect(isCapabilitySupported('deepseek', 'deep_research', 'deepseek-chat')).toBe(false);
    // ...and the reasoner variant re-enables it.
    expect(isCapabilitySupported('deepseek', 'deep_research', 'deepseek-reasoner')).toBe(true);
  });

  it('falls back to the platform matrix when the model has no metadata', () => {
    for (const key of ALL_CAPABILITY_KEYS) {
      expect(isCapabilitySupported('mistral', key, 'totally-unknown-model')).toBe(
        PLATFORM_CAPABILITY_SUPPORT.mistral[key],
      );
    }
  });

  it('uses the active model registry when no model id is passed', () => {
    setActiveAgentModels({ openai: 'gpt-4-turbo' });
    // gpt-4-turbo declares no advanced capabilities.
    expect(isCapabilitySupported('openai', 'think')).toBe(false);
    setActiveAgentModels({ openai: 'gpt-5.6-sol' });
    expect(isCapabilitySupported('openai', 'think')).toBe(true);
  });

  it('getSupportedCapabilities matches the per-model flags for every registered model', () => {
    for (const [platform, models] of Object.entries(AI_MODELS)) {
      for (const model of models) {
        const advanced = getModelAdvancedCapabilities(model.id);
        const map = getSupportedCapabilities(platform, model.id);
        for (const key of ALL_CAPABILITY_KEYS) {
          const expected =
            advanced && advanced[key] !== undefined
              ? !!advanced[key]
              : !!PLATFORM_CAPABILITY_SUPPORT[platform]?.[key];
          expect(map[key], `${platform}/${model.id}/${key}`).toBe(expected);
        }
      }
    }
  });

  it('never advertises a capability the model declares as false', () => {
    const offenders: string[] = [];
    for (const [platform, models] of Object.entries(AI_MODELS)) {
      for (const model of models) {
        const advanced = getModelAdvancedCapabilities(model.id);
        if (!advanced) continue;
        for (const key of ALL_CAPABILITY_KEYS) {
          if (advanced[key] === false && isCapabilitySupported(platform, key, model.id)) {
            offenders.push(`${platform}/${model.id}/${key}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('resolveCapabilitiesForPlatform', () => {
  beforeEach(resetGlobals);

  it('merges defaults, pending and conductor overrides by priority', () => {
    setAgentCapabilityDefaults({ openai: { think: true } });
    setPendingCapabilities({ code_exec: true }, { sticky: true });
    setConductorCapabilityOverrides({ openai: { search: true } });
    expect(resolveCapabilitiesForPlatform('openai', 'gpt-5.6-sol')).toEqual({
      think: true,
      search: true,
      code_exec: true,
    });
  });

  it('drops capabilities the selected model cannot do', () => {
    setPendingCapabilities({ think: true, search: true, deep_research: true, code_exec: true }, { sticky: true });
    // grok-code-fast-1 declares all advanced flags false.
    expect(resolveCapabilitiesForPlatform('grok', 'grok-code-fast-1')).toEqual({});
    // deepseek-chat only supports think.
    expect(resolveCapabilitiesForPlatform('deepseek', 'deepseek-chat')).toEqual({ think: true });
  });
});

describe('parseConductorCapabilities', () => {
  it('parses platform ids, display names and aliases', () => {
    const parsed = parseConductorCapabilities(
      'routing... [CAPABILITIES: anthropic=think,search; chatgpt=research,code]',
      { chatgpt: 'openai' },
    );
    expect(parsed.anthropic).toEqual({ think: true, search: true });
    expect(parsed.openai).toEqual({ deep_research: true, code_exec: true });
  });

  it('ignores unknown flags and malformed chunks', () => {
    const parsed = parseConductorCapabilities('[CAPABILITIES: openai=telepathy; garbage]', {});
    expect(parsed.openai).toEqual({});
    expect(Object.keys(parsed)).toEqual(['openai']);
  });
});

describe('model registry sanity', () => {
  it('resolves model configs used by the capability UI', () => {
    expect(getModelConfig('openai', 'gpt-5.6-sol')?.name).toBe('GPT-5.6 Sol');
    expect(getModelConfig('openai', 'nope-not-real')).toBeUndefined();
  });
});
