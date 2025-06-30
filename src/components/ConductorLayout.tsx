
import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Users, Sparkles, Bot, Search, Zap, Gem, Send } from 'lucide-react';
import ChatMessages from '@/components/ChatMessages';
import type { Message, AIPlatform } from '@/types/chat';

interface ConductorLayoutProps {
  conductorMessages: Message[];
  mainMessages: Message[];
  platforms: AIPlatform[];
  isLoadingResponse: boolean;
  conductorAgent: string;
  onConductorAgentChange: (agent: string) => void;
  onConductorSend?: (message: string) => void;
}

const ConductorLayout: React.FC<ConductorLayoutProps> = ({
  conductorMessages,
  mainMessages,
  platforms,
  isLoadingResponse,
  conductorAgent,
  onConductorAgentChange,
  onConductorSend
}) => {
  const [conductorInput, setConductorInput] = useState('');

  const conductorOptions = [
    { 
      id: 'openai', 
      name: 'ChatGPT', 
      description: 'Advanced reasoning and analysis',
      icon: Bot,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    { 
      id: 'anthropic', 
      name: 'Claude', 
      description: 'Thoughtful and nuanced coordination',
      icon: Sparkles,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      description: 'Deep analytical insights',
      icon: Search,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      id: 'grok', 
      name: 'Grok', 
      description: 'Fast and direct orchestration',
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      id: 'google', 
      name: 'Gemini', 
      description: 'Comprehensive multi-modal coordination',
      icon: Gem,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  const selectedOption = conductorOptions.find(option => option.id === conductorAgent);
  const SelectedIcon = selectedOption?.icon || Brain;

  const handleConductorSend = () => {
    if (conductorInput.trim() && onConductorSend) {
      onConductorSend(conductorInput);
      setConductorInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConductorSend();
    }
  };

  return (
    <div className="flex h-full">
      {/* Conductor Pane */}
      <div className="w-1/2 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-primary">AI Conductor</h3>
                <p className="text-sm text-muted-foreground">Orchestrating multi-agent discussions</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
              Active
            </Badge>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Conductor Agent
            </label>
            <Select value={conductorAgent} onValueChange={onConductorAgentChange}>
              <SelectTrigger className="w-full h-12 bg-background/80 backdrop-blur-sm border-border/50 hover:border-border transition-colors">
                <SelectValue>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${selectedOption?.bgColor || 'bg-gray-50'}`}>
                      <SelectedIcon className={`h-4 w-4 ${selectedOption?.color || 'text-gray-600'}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{selectedOption?.name || 'Select Conductor'}</div>
                      <div className="text-xs text-muted-foreground">{selectedOption?.description}</div>
                    </div>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-full">
                {conductorOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.id} value={option.id} className="h-16 p-3">
                      <div className="flex items-start gap-3 w-full">
                        <div className={`p-2 rounded-md ${option.bgColor} mt-0.5`}>
                          <IconComponent className={`h-4 w-4 ${option.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{option.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
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
          </div>
        </ScrollArea>

        {/* Conductor Input */}
        <div className="p-4 border-t border-border bg-background/50">
          <div className="flex gap-2">
            <Textarea
              value={conductorInput}
              onChange={(e) => setConductorInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask the conductor to orchestrate the discussion..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              disabled={isLoadingResponse}
            />
            <Button
              onClick={handleConductorSend}
              disabled={!conductorInput.trim() || isLoadingResponse}
              size="sm"
              className="self-end h-11"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Conversation Pane */}
      <div className="w-1/2 flex flex-col">
        <div className="p-4 border-b border-border bg-gradient-to-r from-secondary/10 to-secondary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">AI Agents Discussion</h3>
                <p className="text-sm text-muted-foreground">Coordinated multi-agent responses</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-medium px-3 py-1">
              {platforms.filter(p => p.enabled).length} agents active
            </Badge>
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
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ConductorLayout;
