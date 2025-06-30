
import React, { useState, useEffect } from 'react';
import type { Message, AIPlatform } from '@/types/chat';
import ConductorOnboarding from '@/components/conductor/ConductorOnboarding';
import ConductorPane from '@/components/conductor/ConductorPane';
import AgentPane from '@/components/conductor/AgentPane';
import { useConductorOnboarding } from '@/hooks/useConductorOnboarding';

interface ConductorLayoutProps {
  conductorMessages: Message[];
  mainMessages: Message[];
  platforms: AIPlatform[];
  isLoadingResponse: boolean;
  conductorAgent: string;
  onConductorAgentChange: (agent: string) => void;
  onConductorSend?: (message: string) => void;
  onAgentSend?: (message: string) => void;
  user?: any;
}

const ConductorLayout: React.FC<ConductorLayoutProps> = ({
  conductorMessages,
  mainMessages,
  platforms,
  isLoadingResponse,
  conductorAgent,
  onConductorAgentChange,
  onConductorSend,
  onAgentSend,
  user
}) => {
  const [conductorInput, setConductorInput] = useState('');
  const [agentInput, setAgentInput] = useState('');
  
  // Conductor onboarding
  const { hasSeenConductorOnboarding, completeConductorOnboarding } = useConductorOnboarding(user);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding if user hasn't seen it yet
  useEffect(() => {
    if (hasSeenConductorOnboarding === false && user) {
      setShowOnboarding(true);
    }
  }, [hasSeenConductorOnboarding, user]);

  const handleOnboardingComplete = () => {
    completeConductorOnboarding();
    setShowOnboarding(false);
  };

  return (
    <>
      <div className="flex h-full">
        <ConductorPane
          conductorMessages={conductorMessages}
          platforms={platforms}
          isLoadingResponse={isLoadingResponse}
          conductorAgent={conductorAgent}
          onConductorAgentChange={onConductorAgentChange}
          onConductorSend={onConductorSend}
          conductorInput={conductorInput}
          setConductorInput={setConductorInput}
        />

        <AgentPane
          mainMessages={mainMessages}
          platforms={platforms}
          isLoadingResponse={isLoadingResponse}
          onAgentSend={onAgentSend}
          agentInput={agentInput}
          setAgentInput={setAgentInput}
        />
      </div>

      <ConductorOnboarding
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
};

export default ConductorLayout;
