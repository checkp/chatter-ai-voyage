import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import CapabilityToggles from './CapabilityToggles';
import CapabilityDetailsPanel from './CapabilityDetailsPanel';
import {
  setActiveAgentModels,
  PLATFORM_CAPABILITY_SUPPORT,
  isCapabilitySupported,
  ALL_CAPABILITY_KEYS,
  CAPABILITY_META,
  type Capabilities,
} from '@/lib/capabilities';
import '@/config/aiModels';

const renderToggles = (value: Capabilities, onChange = vi.fn()) => {
  const utils = render(
    <TooltipProvider>
      <CapabilityToggles value={value} onChange={onChange} />
    </TooltipProvider>,
  );
  return { ...utils, onChange };
};

const button = (key: keyof typeof CAPABILITY_META) =>
  screen.getByRole('button', { name: CAPABILITY_META[key].label });

describe('CapabilityToggles — provider-valid toggles only', () => {
  beforeEach(() => {
    cleanup();
    setActiveAgentModels({});
  });

  it('renders one control per capability', () => {
    setActiveAgentModels({ openai: 'gpt-5.6-sol' });
    renderToggles({});
    for (const key of ALL_CAPABILITY_KEYS) {
      expect(button(key)).toBeInTheDocument();
    }
  });

  it('disables toggles no selected model supports', () => {
    // DeepSeek V4 Flash: think only.
    setActiveAgentModels({ deepseek: 'deepseek-chat' });
    renderToggles({});
    expect(button('think')).toBeEnabled();
    expect(button('search')).toBeDisabled();
    expect(button('deep_research')).toBeDisabled();
    expect(button('code_exec')).toBeDisabled();
  });

  it('enables a capability when at least one selected agent supports it', () => {
    setActiveAgentModels({ deepseek: 'deepseek-chat', openai: 'gpt-5.6-sol' });
    renderToggles({});
    for (const key of ALL_CAPABILITY_KEYS) {
      expect(button(key), key).toBeEnabled();
    }
  });

  it('does not fire onChange for an unsupported capability', async () => {
    setActiveAgentModels({ deepseek: 'deepseek-chat' });
    const { onChange } = renderToggles({});
    await userEvent.click(button('search')).catch(() => {});
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ search: true }));
  });

  it('toggles a supported capability on click', async () => {
    setActiveAgentModels({ openai: 'gpt-5.6-sol' });
    const { onChange } = renderToggles({});
    await userEvent.click(button('think'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ think: true }));
  });

  it('clears active toggles when the selected model stops supporting them', async () => {
    setActiveAgentModels({ openai: 'gpt-5.6-sol' });
    const onChange = vi.fn();
    const { rerender } = render(
      <TooltipProvider>
        <CapabilityToggles value={{ deep_research: true }} onChange={onChange} />
      </TooltipProvider>,
    );
    onChange.mockClear();
    // gpt-4-turbo supports none of the advanced capabilities.
    setActiveAgentModels({ openai: 'gpt-4-turbo' });
    rerender(
      <TooltipProvider>
        <CapabilityToggles value={{ deep_research: true }} onChange={onChange} />
      </TooltipProvider>,
    );
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ deep_research: false }));
  });

  it('shows the active state only for supported capabilities', () => {
    setActiveAgentModels({ deepseek: 'deepseek-chat' });
    renderToggles({ think: true, search: true });
    expect(button('think')).toHaveAttribute('aria-pressed', 'true');
    expect(button('search')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('CapabilityDetailsPanel', () => {
  beforeEach(cleanup);

  it('explains each capability and labels support for the selected model', () => {
    render(<CapabilityDetailsPanel agentModels={{ deepseek: 'deepseek-chat' }} />);
    for (const key of ALL_CAPABILITY_KEYS) {
      expect(screen.getByText(CAPABILITY_META[key].label)).toBeInTheDocument();
    }
    const supportedCount = ALL_CAPABILITY_KEYS.filter(k =>
      isCapabilitySupported('deepseek', k, 'deepseek-chat'),
    ).length;
    expect(screen.getAllByText('Supported')).toHaveLength(supportedCount);
    expect(screen.getAllByText('Not supported')).toHaveLength(
      ALL_CAPABILITY_KEYS.length - supportedCount,
    );
  });

  it('names the models that support a capability', () => {
    render(<CapabilityDetailsPanel agentModels={{ openai: 'gpt-5.6-sol' }} />);
    expect(screen.getAllByText(/Supported by: GPT-5\.6 Sol/).length).toBeGreaterThan(0);
  });

  it('treats an empty agent selection as unconstrained', () => {
    render(<CapabilityDetailsPanel agentModels={{}} />);
    expect(screen.getAllByText('Supported')).toHaveLength(ALL_CAPABILITY_KEYS.length);
    expect(PLATFORM_CAPABILITY_SUPPORT.openai.think).toBe(true);
  });
});
