import React from 'react';
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import ArtifactPanel from '@/components/build/ArtifactPanel';
import { useBuildMode } from '@/hooks/useBuildMode';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AIPlatform, Message } from '@/types/chat';

interface BuildLayoutProps {
  user: SupabaseUser | null;
  platforms: AIPlatform[];
  activeChatId: string | null;
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  input: string;
  setInput: (value: string) => void;
}

const BuildLayout: React.FC<BuildLayoutProps> = ({
  user, platforms, activeChatId, messages, isLoadingMessages, input, setInput,
}) => {
  const build = useBuildMode(user, platforms, activeChatId, messages);

  const handleSend = async () => {
    const prompt = input;
    setInput('');
    await build.send(prompt);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={42} minSize={25} className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Builders</span>
          <Select value={build.builder} onValueChange={build.setBuilder}>
            <SelectTrigger className="h-7 w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relay" className="text-xs">
                Relay — every enabled agent iterates
              </SelectItem>
              {build.buildAgents.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.icon} {p.name} only
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Target</span>
            <Select value={build.lang} onValueChange={(v) => build.setLang(v as 'html' | 'python')}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html" className="text-xs">Web app</SelectItem>
                <SelectItem value="python" className="text-xs">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>


        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ChatMessages
            messages={build.transcript}
            isLoadingMessages={isLoadingMessages}
            isLoadingResponse={build.isBuilding}
            platforms={platforms}
          />
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          isLoadingResponse={build.isBuilding}
          isPending={build.isBuilding}
          placeholder="Describe the app, or the next change to make…"
          enableAttachments={false}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={58} minSize={30} className="min-w-0">
        <ArtifactPanel
          versions={build.versions}
          lang={build.lang}

          isBuilding={build.isBuilding}
          workingAgent={build.workingAgent}
          platforms={platforms}
          onSaveEdit={build.saveManualEdit}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default BuildLayout;
