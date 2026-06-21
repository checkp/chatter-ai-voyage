
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Brain, HelpCircle, Copy } from 'lucide-react';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import { useToast } from '@/hooks/use-toast';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import type { Message, AIPlatform } from '@/types/chat';
import ConductorAgentSelector from './ConductorAgentSelector';

interface ConductorPaneProps {
  conductorMessages: Message[];
  platforms: AIPlatform[];
  isLoadingResponse: boolean;
  conductorAgent: string;
  onConductorAgentChange: (agent: string) => void;
  onConductorSend?: (message: string) => void;
  conductorInput: string;
  setConductorInput: (input: string) => void;
  onGenerateImages?: (prompt: string, models: string[]) => void;
}

const ConductorPane: React.FC<ConductorPaneProps> = ({
  conductorMessages,
  platforms,
  isLoadingResponse,
  conductorAgent,
  onConductorAgentChange,
  onConductorSend,
  conductorInput,
  setConductorInput,
  onGenerateImages,
}) => {
  const { toast } = useToast();
  const messagesEndRef = useAutoScroll([conductorMessages.length]);

  const samplePrompt = `You are an AI Conductor orchestrating a multi-agent discussion. Your role is to:

1. Analyze the user's question and determine which AI agents should participate
2. Provide specific instructions to each agent about their focus area
3. Synthesize responses from multiple agents into coherent insights
4. Guide the conversation flow to ensure comprehensive coverage

Please coordinate a discussion about: [USER'S TOPIC]

Involve these agents with these specific roles:
- Agent A: Focus on [SPECIFIC ASPECT]
- Agent B: Focus on [SPECIFIC ASPECT]
- Agent C: Focus on [SPECIFIC ASPECT]

Provide a structured analysis comparing their different perspectives.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(samplePrompt);
    toast({
      title: "Copied!",
      description: "Sample prompt copied to clipboard",
    });
  };

  const handleConductorSend = () => {
    if (conductorInput.trim() && onConductorSend) {
      onConductorSend(conductorInput);
      setConductorInput('');
    }
  };

  const handleConductorKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConductorSend();
    }
  };

  return (
    <div className="flex-1 min-w-0 border-r border-border flex flex-col">
      <div className="p-2.5 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-primary leading-tight truncate">AI Conductor</h3>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">Orchestrating multi-agent discussions</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-4" align="end">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">What is the AI Conductor?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The Conductor orchestrates discussions between multiple AI agents, 
                      assigning specific roles and synthesizing their responses for comprehensive insights.
                    </p>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-xs">Sample Prompt:</h5>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={copyPrompt}
                        className="h-6 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded-md p-3 text-xs font-mono leading-relaxed max-h-32 overflow-y-auto">
                      {samplePrompt}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
              Active
            </Badge>
          </div>
        </div>
        
        <ConductorAgentSelector
          conductorAgent={conductorAgent}
          onConductorAgentChange={onConductorAgentChange}
        />
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conductorMessages.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto">
                <Brain className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No conductor messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send a message to start the orchestrated discussion
                </p>
              </div>
            </div>
          ) : (
            <ChatMessages
              messages={conductorMessages}
              isLoadingMessages={false}
              isLoadingResponse={isLoadingResponse}
              platforms={platforms}
            />
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </ScrollArea>

      <ChatInput
        input={conductorInput}
        setInput={setConductorInput}
        handleSend={handleConductorSend}
        isLoadingResponse={isLoadingResponse}
        isPending={false}
        placeholder="Chat with the conductor privately. The conductor will decide if your question needs multi-agent coordination."
        enableAttachments={false}
      />
    </div>
  );
};

export default ConductorPane;
