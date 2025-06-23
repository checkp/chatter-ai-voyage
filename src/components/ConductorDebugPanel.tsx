
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Bug, Crown, MessageSquare } from 'lucide-react';
import type { Message, AIPlatform } from '@/types/chat';

interface ConductorDebugPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  internalConversation: Message[];
  conductorPlatform: string | null;
  platforms: AIPlatform[];
  isActive: boolean;
  discussionRounds: number;
}

const ConductorDebugPanel: React.FC<ConductorDebugPanelProps> = ({
  isOpen,
  onToggle,
  internalConversation,
  conductorPlatform,
  platforms,
  isActive,
  discussionRounds
}) => {
  const getPlatformInfo = (platformId: string) => {
    return platforms.find(p => p.id === platformId);
  };

  const getConductorInfo = () => {
    return conductorPlatform ? getPlatformInfo(conductorPlatform) : null;
  };

  const groupMessagesByRound = () => {
    const grouped = internalConversation.reduce((acc, message) => {
      const round = message.roundNumber || 1;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(message);
      return acc;
    }, {} as Record<number, Message[]>);

    return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
  };

  const conductor = getConductorInfo();

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between bg-muted/20 hover:bg-muted/40"
        >
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <span>Conductor Debug Panel</span>
            {isActive && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                Active
              </Badge>
            )}
            {internalConversation.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {internalConversation.length} internal messages
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Internal Agent Discussion
              {conductor && (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs text-muted-foreground">Conductor:</span>
                  <Badge variant="outline" className="text-xs">
                    <span className="mr-1">{conductor.icon}</span>
                    {conductor.name}
                  </Badge>
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Discussion Rounds: {discussionRounds}</span>
              <span>Internal Messages: {internalConversation.length}</span>
              {isActive && <span className="text-amber-600 font-medium">● Discussion in progress</span>}
            </div>
          </CardHeader>
          
          <CardContent>
            {internalConversation.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No internal conversation yet</p>
                <p className="text-xs mt-1">Agents will discuss here before the conductor provides a summary</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {groupMessagesByRound().map(([round, messages]) => (
                    <div key={round} className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px bg-border flex-1" />
                        <Badge variant="secondary" className="text-xs">
                          Round {round}
                        </Badge>
                        <div className="h-px bg-border flex-1" />
                      </div>
                      
                      {messages.map((message) => {
                        const platform = getPlatformInfo(message.platform || '');
                        return (
                          <div
                            key={message.id}
                            className="p-3 rounded-lg bg-muted/10 border"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {platform && (
                                <>
                                  <span className="text-sm">{platform.icon}</span>
                                  <span className="text-sm font-medium">{platform.name}</span>
                                </>
                              )}
                              <Badge variant="outline" className="text-xs ml-auto">
                                Internal
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              {message.content}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ConductorDebugPanel;
