
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Brain, Users } from 'lucide-react';
import ChatMessages from '@/components/ChatMessages';
import type { Message, AIPlatform } from '@/types/chat';

interface ConductorLayoutProps {
  conductorMessages: Message[];
  mainMessages: Message[];
  platforms: AIPlatform[];
  isLoadingResponse: boolean;
  conductorAgent: string;
  onConductorAgentChange: (agent: string) => void;
}

const ConductorLayout: React.FC<ConductorLayoutProps> = ({
  conductorMessages,
  mainMessages,
  platforms,
  isLoadingResponse,
  conductorAgent,
  onConductorAgentChange
}) => {
  const conductorOptions = [
    { id: 'openai', name: 'ChatGPT (OpenAI)', icon: '🤖' },
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: '🧠' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔍' },
    { id: 'grok', name: 'Grok', icon: '⚡' }
  ];

  return (
    <div className="flex h-full">
      {/* Conductor Pane */}
      <div className="w-1/2 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Conductor</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              AI Orchestrator
            </Badge>
          </div>
          
          <select
            value={conductorAgent}
            onChange={(e) => onConductorAgentChange(e.target.value)}
            className="w-full p-2 rounded border border-input bg-background text-sm"
          >
            {conductorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.icon} {option.name}
              </option>
            ))}
          </select>
        </div>

        <ScrollArea className="flex-1 p-4">
          <ChatMessages
            messages={conductorMessages}
            isLoadingMessages={false}
            isLoadingResponse={isLoadingResponse}
            platforms={platforms}
          />
        </ScrollArea>
      </div>

      {/* Main Conversation Pane */}
      <div className="w-1/2 flex flex-col">
        <div className="p-3 border-b border-border bg-secondary/5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">AI Agents Discussion</h3>
            <Badge variant="outline" className="text-xs">
              {platforms.filter(p => p.enabled).length} agents active
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <ChatMessages
            messages={mainMessages}
            isLoadingMessages={false}
            isLoadingResponse={isLoadingResponse}
            platforms={platforms}
          />
        </ScrollArea>
      </div>
    </div>
  );
};

export default ConductorLayout;
