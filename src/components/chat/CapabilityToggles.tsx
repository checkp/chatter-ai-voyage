import React, { useEffect, useState } from 'react';
import { Brain, Globe, Telescope, Terminal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ALL_CAPABILITY_KEYS,
  CAPABILITY_META,
  getActiveAgentModels,
  isCapabilitySupported,
  subscribeActiveAgentModels,
  type Capabilities,
  type CapabilityKey,
} from '@/lib/capabilities';
import { getModelConfig } from '@/config/aiModels';

const ICON: Record<CapabilityKey, React.ComponentType<{ className?: string }>> = {
  think: Brain,
  search: Globe,
  deep_research: Telescope,
  code_exec: Terminal,
};

interface Props {
  value: Capabilities;
  onChange: (next: Capabilities) => void;
  disabled?: boolean;
}

const CapabilityToggles: React.FC<Props> = ({ value, onChange, disabled }) => {
  // Re-render whenever the active agents / their selected models change.
  const [agentModels, setAgentModels] = useState<Record<string, string>>(() => getActiveAgentModels());
  useEffect(() => subscribeActiveAgentModels(() => setAgentModels(getActiveAgentModels())), []);

  const platformIds = Object.keys(agentModels);

  const supportInfo = (key: CapabilityKey) => {
    const supporting = platformIds.filter(id => isCapabilitySupported(id, key, agentModels[id]));
    return {
      supported: platformIds.length === 0 || supporting.length > 0,
      supporting,
    };
  };

  // When the selected models change, drop any active toggle no model can do.
  useEffect(() => {
    if (platformIds.length === 0) return;
    const cleared: Capabilities = { ...value };
    let changed = false;
    for (const key of ALL_CAPABILITY_KEYS) {
      if (value[key] && !platformIds.some(id => isCapabilitySupported(id, key, agentModels[id]))) {
        cleared[key] = false;
        changed = true;
      }
    }
    if (changed) onChange(cleared);
  }, [agentModels, value, onChange]);


  const toggle = (key: CapabilityKey) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ALL_CAPABILITY_KEYS.map((key) => {
        const Icon = ICON[key];
        const active = !!value[key];
        const meta = CAPABILITY_META[key];
        const { supported, supporting } = supportInfo(key);
        const isOff = disabled || !supported;
        const names = supporting
          .map(id => getModelConfig(id, agentModels[id])?.name ?? agentModels[id])
          .join(', ');
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={isOff}
                onClick={() => toggle(key)}
                aria-pressed={active && supported}
                aria-label={meta.label}
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  active && supported
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent text-muted-foreground border-border',
                  isOff ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{meta.label}</span>
                {supported && supporting.length > 0 && platformIds.length > 0 && (
                  <span className="tabular-nums opacity-70">{supporting.length}</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[240px] text-xs">
                {meta.tooltip}
                {platformIds.length > 0 && (
                  <span className="block mt-1 opacity-80">
                    {supported ? `Supported by: ${names}` : 'No selected model supports this'}
                  </span>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="About advanced capabilities"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[320px] max-h-[60vh] overflow-y-auto">
          <p className="mb-2 text-sm font-medium">Advanced capabilities</p>
          <CapabilityDetailsPanel agentModels={agentModels} active={value} />
        </PopoverContent>
      </Popover>
    </div>
  );

};

export default CapabilityToggles;
