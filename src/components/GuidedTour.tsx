
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TourStep } from '@/hooks/useTour';

interface GuidedTourProps {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}

interface TooltipPos {
  top: number;
  left: number;
  spotTop: number;
  spotLeft: number;
  spotWidth: number;
  spotHeight: number;
}

const GuidedTour: React.FC<GuidedTourProps> = ({
  isActive,
  currentStep,
  steps,
  onNext,
  onPrev,
  onEnd,
}) => {
  const [pos, setPos] = useState<TooltipPos | null>(null);

  const computePos = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;
    const step = steps[currentStep];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const padding = 6;
    const spotTop = rect.top - padding;
    const spotLeft = rect.left - padding;
    const spotWidth = rect.width + padding * 2;
    const spotHeight = rect.height + padding * 2;

    let top: number;
    let left: number;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const placement = step.placement || 'bottom';

    switch (placement) {
      case 'top':
        top = spotTop - tooltipHeight - 12;
        left = spotLeft + spotWidth / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = spotTop + spotHeight / 2 - tooltipHeight / 2;
        left = spotLeft - tooltipWidth - 12;
        break;
      case 'right':
        top = spotTop + spotHeight / 2 - tooltipHeight / 2;
        left = spotLeft + spotWidth + 12;
        break;
      default: // bottom
        top = spotTop + spotHeight + 12;
        left = spotLeft + spotWidth / 2 - tooltipWidth / 2;
    }

    // Clamp to viewport
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    setPos({ top, left, spotTop, spotLeft, spotWidth, spotHeight });
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    computePos();
    window.addEventListener('resize', computePos);
    window.addEventListener('scroll', computePos, true);
    return () => {
      window.removeEventListener('resize', computePos);
      window.removeEventListener('scroll', computePos, true);
    };
  }, [computePos]);

  // Scroll element into view
  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;
    const el = document.querySelector(`[data-tour="${steps[currentStep].target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(computePos, 300);
    }
  }, [isActive, currentStep, steps, computePos]);

  if (!isActive || !pos || !steps[currentStep]) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[9999]" onClick={onEnd}>
      {/* Overlay with spotlight cutout using clip-path */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={pos.spotLeft}
              y={pos.spotTop}
              width={pos.spotWidth}
              height={pos.spotHeight}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Spotlight ring */}
      <div
        className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent animate-pulse"
        style={{
          top: pos.spotTop,
          left: pos.spotLeft,
          width: pos.spotWidth,
          height: pos.spotHeight,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip card */}
      <div
        className="absolute bg-card border border-border rounded-xl shadow-2xl p-4 animate-scale-in"
        style={{
          top: pos.top,
          left: pos.left,
          width: 320,
          zIndex: 10000,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mt-1 -mr-1" onClick={onEnd}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {step.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>
          <div className="flex gap-1">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={onPrev}>
                <ChevronLeft className="h-3 w-3 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" className="h-7 text-xs px-3" onClick={onNext}>
              {currentStep === steps.length - 1 ? 'Done' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
