
import { useState, useCallback, useEffect } from 'react';

export interface TourStep {
  target: string;        // data-tour attribute value
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'chat-mode',
    title: '🔄 Chat Modes',
    description: 'Switch between Discussion, Side-by-Side, and Conductor mode. Each mode changes how AI agents interact — try them all!',
    placement: 'bottom',
  },
  {
    target: 'isolated-mode',
    title: '🛡️ Isolated Mode',
    description: 'Toggle isolated mode so each AI responds independently without seeing other agents\' replies — great for unbiased comparisons.',
    placement: 'bottom',
  },
  {
    target: 'conductor-controls',
    title: '🧠 Conductor AI',
    description: 'Start the Conductor to let an orchestrator AI assign roles, mediate debates, and synthesize answers from all models.',
    placement: 'bottom',
  },
  {
    target: 'free-mode',
    title: '🤖 Free Mode',
    description: 'Let the agents talk among themselves autonomously. Set a message limit and watch them debate, agree, and build on each other\'s ideas.',
    placement: 'bottom',
  },
  {
    target: 'tab-chat',
    title: '💬 Chat Tab',
    description: 'Your main conversation area. All AI discussions happen here.',
    placement: 'bottom',
  },
  {
    target: 'tab-settings',
    title: '⚙️ Settings',
    description: 'Configure your API keys, choose models, reorder agents, and manage your account.',
    placement: 'bottom',
  },
  {
    target: 'token-balance',
    title: '🪙 Token Balance',
    description: 'Your token count. Every AI message costs tokens — purchase more or earn free daily tokens.',
    placement: 'bottom',
  },
  {
    target: 'chat-input',
    title: '✍️ Message Input',
    description: 'Type your message and hit Send. Use the Play button to send and auto-start a multi-agent conversation, or the Image button to generate AI art.',
    placement: 'top',
  },
];

const TOUR_STORAGE_KEY = 'roboheard_tour_completed';

export const useTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([]);

  const startTour = useCallback(() => {
    // Filter to only steps whose target element exists in the DOM
    const available = TOUR_STEPS.filter(
      step => document.querySelector(`[data-tour="${step.target}"]`)
    );
    setVisibleSteps(available);
    setCurrentStep(0);
    setIsActive(available.length > 0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < visibleSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, visibleSteps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  }, []);

  const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';

  return {
    isActive,
    currentStep,
    visibleSteps,
    startTour,
    nextStep,
    prevStep,
    endTour,
    hasCompletedTour,
  };
};
