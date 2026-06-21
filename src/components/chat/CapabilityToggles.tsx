import React from 'react';
import { Brain, Globe, Telescope, Terminal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ALL_CAPABILITY_KEYS, CAPABILITY_META, type Capabilities, type CapabilityKey } from '@/lib/capabilities';

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
  const toggle = (key: CapabilityKey) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ALL_CAPABILITY_KEYS.map((key) => {
        const Icon = ICON[key];
        const active = !!value[key];
        const meta = CAPABILITY_META[key];
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(key)}
                aria-pressed={active}
                aria-label={meta.label}
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent text-muted-foreground border-border',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{meta.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent><p className="max-w-[220px] text-xs">{meta.tooltip}</p></TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default CapabilityToggles;
