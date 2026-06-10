
import React, { useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import SettingsPanel from '@/components/SettingsPanel';
import SideBySideLayout from '@/components/SideBySideLayout';
import ConductorLayout from '@/components/ConductorLayout';
import { useMultiImageGeneration } from '@/hooks/useMultiImageGeneration';
import { IMAGE_PANEL_PLATFORM } from '@/config/imageModels';
import type { AIPlatform, ChatMode } from '@/types/chat';

interface MainContentProps {
  activeTab: string;
  activeChatMode: ChatMode;
  isolatedMode: boolean;
  platforms: AIPlatform[];
  messages: any;
  isLoadingMessages: boolean;
  isLoadingResponse: boolean;
  transformedStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  togglePlatform: (platformId: string) => void;
  scrollAreaRef: React.RefObject<any>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  activeChatId: string | null;
  input: string;
  setInput: (input: string) => void;
  handleSend: (activeChatId: string | null) => void;
  handleStop: () => void;
  sendMessageMutation: any;
  canStop: boolean;
  getPendingCount: () => number;
  isFreeMode: boolean;
  isFreeModeRunning: boolean;
  handleSendAndStartConversation: () => void;
  // Conductor mode props
  conductorMessages?: any;
  conductorAgent?: string;
  onConductorAgentChange?: (agent: string) => void;
  handleConductorSend?: (message: string) => void;
  user?: any;
}

const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  activeChatMode,
  isolatedMode,
  platforms,
  messages,
  isLoadingMessages,
  isLoadingResponse,
  transformedStatuses,
  togglePlatform,
  scrollAreaRef,
  messagesEndRef,
  activeChatId,
  input,
  setInput,
  handleSend,
  handleStop,
  sendMessageMutation,
  canStop,
  getPendingCount,
  isFreeMode,
  isFreeModeRunning,
  handleSendAndStartConversation,
  conductorMessages,
  conductorAgent = 'openai',
  onConductorAgentChange,
  handleConductorSend,
  user
}) => {
  const activeAIStatusesBool = Object.keys(transformedStatuses).reduce((acc, key) => {
    acc[key] = transformedStatuses[key] === 'responding' || transformedStatuses[key] === 'thinking';
    return acc;
  }, {} as Record<string, boolean>);

  const queryClient = useQueryClient();
  const { generate: generateMultiImages, isGenerating: isGeneratingImages } = useMultiImageGeneration();

  const handleGenerateImages = async (prompt: string, models: string[]) => {
    if (!activeChatId || !prompt.trim() || models.length === 0) return;

    // Persist user prompt + placeholder so it appears immediately
    const now = new Date().toISOString();
    await supabase.from('messages').insert([
      { conversation_id: activeChatId, content: prompt, sender: 'user', created_at: now },
    ]);
    queryClient.invalidateQueries({ queryKey: ['messages', activeChatId] });

    const result = await generateMultiImages(prompt, models);
    if (!result) return;

    await supabase.from('messages').insert([
      {
        conversation_id: activeChatId,
        content: JSON.stringify(result),
        sender: 'ai',
        platform: IMAGE_PANEL_PLATFORM,
        created_at: new Date().toISOString(),
      },
    ]);
    queryClient.invalidateQueries({ queryKey: ['messages', activeChatId] });
    queryClient.invalidateQueries({ queryKey: ['tokens'] });
    queryClient.invalidateQueries({ queryKey: ['generated-images'] });
  };

  const handleAgentSend = (message: string) => {
    if (activeChatId && message.trim()) {
      setInput(message);
      handleSend(activeChatId);
    }
  };

  return (
    <>
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <>
            {activeChatMode === 'conductor' ? (
              <ConductorLayout
                conductorMessages={conductorMessages || []}
                mainMessages={messages || []}
                platforms={platforms}
                isLoadingResponse={isLoadingResponse}
                conductorAgent={conductorAgent}
                onConductorAgentChange={onConductorAgentChange || (() => {})}
                onConductorSend={handleConductorSend}
                onAgentSend={handleAgentSend}
                user={user}
              />
            ) : activeChatMode === 'side-by-side' ? (
              <SideBySideLayout
                enabledPlatforms={platforms}
                messages={messages}
                isLoadingResponse={isLoadingResponse}
                activeAIStatuses={activeAIStatusesBool}
                onTogglePlatform={togglePlatform}
                chatMode={activeChatMode}
                isolatedMode={isolatedMode}
              />
            ) : (
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="p-4">
                  <ChatMessages 
                    messages={messages}
                    isLoadingMessages={isLoadingMessages}
                    isLoadingResponse={isLoadingResponse}
                    platforms={platforms}
                  />
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </ScrollArea>
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <ScrollArea className="h-full">
            <div className="p-4">
              <SettingsPanel />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Chat Input - only show for non-conductor modes */}
      {activeTab === 'chat' && activeChatMode !== 'conductor' && (
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={() => handleSend(activeChatId)}
          handleStop={handleStop}
          isLoadingResponse={isLoadingResponse || isGeneratingImages}
          isPending={sendMessageMutation.isPending || isGeneratingImages}
          canStop={canStop}
          pendingCount={getPendingCount()}
          isFreeMode={isFreeMode}
          isFreeModeRunning={isFreeModeRunning}
          onSendAndStartConversation={handleSendAndStartConversation}
          onGenerateImages={activeChatId ? handleGenerateImages : undefined}
        />
      )}
    </>
  );
};

export default MainContent;
