
import React from 'react';
import { useConductorHooks } from './ConductorHooks';
import DesktopLayout from './DesktopLayout';
import type { DesktopInterfaceProps } from './types';

const DesktopInterface: React.FC<DesktopInterfaceProps> = (props) => {
  const {
    user,
    platforms,
    callAIAPI,
    activeChatId,
    activeChatMode,
    messages,
    setInput
  } = props;

  const conductorHooks = useConductorHooks({
    user,
    platforms,
    callAIAPI,
    activeChatId,
    activeChatMode,
    messages
  });

  const handleConductorSendWithInput = async (message: string) => {
    await conductorHooks.handleConductorSend(message);
    setInput('');
  };

  return (
    <DesktopLayout
      {...props}
      conductorState={conductorHooks.conductorState}
      onStartConductor={conductorHooks.startConductor}
      onStopConductor={conductorHooks.stopConductor}
      onRequestConductorDirection={conductorHooks.handleRequestConductorDirection}
      conductorMessages={conductorHooks.conductorMessages}
      conductorAgent={conductorHooks.conductorAgent}
      onConductorAgentChange={conductorHooks.setConductorAgent}
      handleConductorSend={handleConductorSendWithInput}
      showConductorSummary={conductorHooks.showConductorSummary}
      setShowConductorSummary={conductorHooks.setShowConductorSummary}
      currentSummary={conductorHooks.currentSummary}
      conductorIsProcessing={conductorHooks.isProcessing}
    />
  );
};

export default DesktopInterface;
