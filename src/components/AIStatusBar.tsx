
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Settings } from 'lucide-react';
import { useState } from 'react';
import type { AIPlatform, Chat, ChatMode } from '@/types/chat';

interface AIStatusBarProps {
  platforms: AIPlatform[];
  activeAIStatuses: Record<string, 'thinking' | 'responding' | 'completed' | 'error'>;
  currentChat?: Chat;
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSendMessage: (message: string, platformId: string) => Promise<void>;
  onUpdateAgentOrder: (platforms: AIPlatform[]) => void;
}

const AIStatusBar: React.FC<AIStatusBarProps> = ({
  platforms,
  activeAIStatuses,
  currentChat,
  currentMode,
  onModeChange,
  onSendMessage,
  onUpdateAgentOrder
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [privateMessage, setPrivateMessage] = useState<string>('');
  const [isSendingPrivate, setIsSendingPrivate] = useState<boolean>(false);

  const enabledPlatforms = platforms.filter(p => p.enabled);

  const handlePrivateMessageSend = async () => {
    if (!privateMessage.trim() || !selectedAgent || !currentChat) return;
    
    setIsSendingPrivate(true);
    try {
      await onSendMessage(privateMessage.trim(), selectedAgent);
      setPrivateMessage('');
    } catch (error) {
      console.error('Error sending private message:', error);
    } finally {
      setIsSendingPrivate(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePrivateMessageSend();
    }
  };

  if (enabledPlatforms.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 p-4">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="text-sm font-medium text-amber-800">Active AI Agents:</div>
        {enabledPlatforms.map((platform) => {
          const status = activeAIStatuses[platform.id] || 'completed';
          const isActive = status === 'responding' || status === 'thinking';
          
          return (
            <Badge
              key={platform.id}
              variant={isActive ? 'default' : 'secondary'}
              className={`flex items-center gap-1 ${
                platform.id === 'openai' ? 'bg-[#8FBC8F] text-white' :
                platform.id === 'anthropic' ? 'bg-[#98D982] text-white' :
                platform.id === 'deepseek' ? 'bg-[#87CEEB] text-white' :
                platform.id === 'grok' ? 'bg-[#DDA0DD] text-white' :
                'bg-gray-500 text-white'
              }`}
            >
              {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
              {platform.name}
            </Badge>
          );
        })}
      </div>

      <Separator className="my-3" />

      {/* Private Chat Section */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-amber-800">Chat Privately with Agent:</div>
        <div className="flex gap-2">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {enabledPlatforms.map((platform) => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex-1 flex gap-2">
            <Input
              value={privateMessage}
              onChange={(e) => setPrivateMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Send a private message to the selected agent..."
              disabled={!selectedAgent || isSendingPrivate}
              className="flex-1"
            />
            <Button
              onClick={handlePrivateMessageSend}
              disabled={!privateMessage.trim() || !selectedAgent || isSendingPrivate}
              size="icon"
            >
              {isSendingPrivate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStatusBar;
