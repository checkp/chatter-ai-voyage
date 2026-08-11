import React from 'react';
import { Brain, Globe, Telescope, Terminal, Check, X } from 'lucide-react';
import {
  ALL_CAPABILITY_KEYS,
  CAPABILITY_META,
  isCapabilitySupported,
  type CapabilityKey,
} from '@/lib/capabilities';
import { getModelConfig } from '@/config/aiModels';

const ICON: Record<CapabilityKey, React.ComponentType<{ className?: string }>> = {
  think: Brain,
  search: Globe,
  deep_research: Telescope,
  code_exec: Terminal,
};

/** Longer, user-facing explanation of each capability (presentation copy). */
const DETAILS: Record<CapabilityKey, string> = {
  think:
    'Gives the model extra reasoning budget before it answers. Best for maths, planning, tricky debugging and multi-constraint questions. Slower and costs more tokens.',
  search:
    'Lets the model query the live web and cite its sources, so answers can include information newer than its training cutoff.',
  deep_research:
    'Runs a multi-step research loop — the model plans, searches, reads and synthesises into a longer report. Much slower and the most expensive option.',
  code_exec:
    'The model can write and actually run code to compute results, parse data or verify its own answer instead of guessing.',
};

interface Props {
  /** Platform → currently selected model id. */
  agentModels: Record<string, string>;
  /** Optional per-capability active state, to show what is currently on. */
  active?: Partial<Record<CapabilityKey, boolean>>;
  className?: string;
}

/**
 * Explains every advanced capability and whether the currently selected
 * model(s) support it.
 */
const CapabilityDetailsPanel: React.FC<Props> = ({ agentModels, active, className }) => {
  const platformIds = Object.keys(agentModels);

  return (
    <div className={['space-y-3 text-sm', className].filter(Boolean).join(' ')}>
      {ALL_CAPABILITY_KEYS.map((key) => {
        const Icon = ICON[key];
        const supporting = platformIds.filter((id) => isCapabilitySupported(id, key, agentModels[id]));
        const unsupported = platformIds.filter((id) => !supporting.includes(id));
        const supported = platformIds.length === 0 || supporting.length > 0;
        const label = (ids: string[]) =>
          ids
            .map((id) => getModelConfig(id, agentModels[id])?.name ?? agentModels[id] ?? id)
            .join(', ');

        return (
          <div key={key} className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{CAPABILITY_META[key].label}</span>
              {active?.[key] && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  On
                </span>
              )}
              <span
                className={[
                  'ml-auto inline-flex items-center gap-1 text-xs',
                  supported ? 'text-muted-foreground' : 'text-destructive',
                ].join(' ')}
              >
                {supported ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {supported ? 'Supported' : 'Not supported'}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{DETAILS[key]}</p>
            {platformIds.length > 0 && (
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {supporting.length > 0 && <p>Supported by: {label(supporting)}</p>}
                {unsupported.length > 0 && <p className="opacity-70">Ignored for: {label(unsupported)}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CapabilityDetailsPanel;
