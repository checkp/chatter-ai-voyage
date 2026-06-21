
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';
import ChatMessages from '@/components/ChatMessages';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import type { Message, AIPlatform } from '@/types/chat';

interface AgentPaneProps {
  mainMessages: Message[];
  platforms: AIPlatform[];
  isLoadingResponse: boolean;
  onAgentSend?: (message: string) => void;
  agentInput: string;
  setAgentInput: (input: string) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const AgentPane: React.FC<AgentPaneProps> = ({
  mainMessages,
  platforms,
  isLoadingResponse,
  onAgentSend,
  agentInput,
  setAgentInput,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const messagesEndRef = useAutoScroll([mainMessages.length]);

  const handleAgentSend = () => {
    if (agentInput.trim() && onAgentSend) {
      onAgentSend(agentInput);
      setAgentInput('');
    }
  };

  const handleAgentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAgentSend();
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l border-border bg-gradient-to-b from-secondary/10 to-secondary/5 flex flex-col items-center py-2 gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onToggleCollapsed}
          aria-label="Expand agent discussion panel"
          title="Expand agent discussion"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="p-1.5 rounded-md bg-secondary/20">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div
          className="text-[10px] font-medium text-muted-foreground tracking-wide select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Agents · {platforms.filter(p => p.enabled).length}
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/2 flex flex-col min-w-0">
      <div className="p-2.5 border-b border-border bg-gradient-to-r from-secondary/10 to-secondary/5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-secondary/20 shrink-0">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground leading-tight truncate">AI Agents Discussion</h3>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">Coordinated multi-agent responses</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5">
              {platforms.filter(p => p.enabled).length} agents
            </Badge>
            {onToggleCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onToggleCollapsed}
                aria-label="Collapse agent discussion panel"
                title="Collapse to the right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {mainMessages.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No agent responses yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The conductor will coordinate responses from active agents
                </p>
              </div>
            </div>
          ) : (
            <ChatMessages
              messages={mainMessages}
              isLoadingMessages={false}
              isLoadingResponse={isLoadingResponse}
              platforms={platforms}
            />
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-background/50">
        <div className="flex gap-2">
          <Textarea
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            onKeyDown={handleAgentKeyPress}
            placeholder="Send a direct message to the AI agents..."
            className="flex-1 min-h-[44px] max-h-32 resize-none"
            disabled={isLoadingResponse}
          />
          <Button
            onClick={handleAgentSend}
            disabled={!agentInput.trim() || isLoadingResponse}
            size="sm"
            className="self-end h-11"
            variant="outline"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentPane;

