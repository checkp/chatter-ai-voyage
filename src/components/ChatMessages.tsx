
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from 'lucide-react';
import type { Message, AIPlatform } from '@/types/chat';

interface ChatMessagesProps {
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  isLoadingResponse: boolean;
  platforms: AIPlatform[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoadingMessages,
  isLoadingResponse,
  platforms
}) => {
  const getPlatformName = (platformId: string) => {
    return platforms.find(p => p.id === platformId)?.name || platformId;
  };

  const getAgentColor = (platformId: string) => {
    switch (platformId) {
      case 'openai':
        return {
          bg: 'bg-green-50 border-l-green-400',
          text: 'text-green-700',
          border: 'border-l-green-400'
        };
      case 'anthropic':
        return {
          bg: 'bg-teal-50 border-l-teal-400', 
          text: 'text-teal-700',
          border: 'border-l-teal-400'
        };
      case 'deepseek':
        return {
          bg: 'bg-emerald-50 border-l-emerald-400',
          text: 'text-emerald-700', 
          border: 'border-l-emerald-400'
        };
      case 'grok':
        return {
          bg: 'bg-cyan-50 border-l-cyan-400',
          text: 'text-cyan-700',
          border: 'border-l-cyan-400'
        };
      default:
        return {
          bg: 'bg-gray-50 border-l-gray-400',
          text: 'text-gray-700',
          border: 'border-l-gray-400'
        };
    }
  };

  if (isLoadingMessages) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="w-80 h-9" />
        <Skeleton className="w-64 h-9" />
        <Skeleton className="w-96 h-9" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-xl font-semibold mb-2 text-green-800">Start herding your AI agents</h3>
        <p className="text-green-600 mb-4">Send a message to begin chatting with your RoboHerd assistants</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => {
        const agentColors = message.platform ? getAgentColor(message.platform) : null;
        
        return (
          <div key={message.id} className={`mb-4 flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-3xl rounded-lg p-4 text-sm ${message.sender === 'user'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : `${agentColors?.bg || 'bg-gray-50'} border-l-4 ${agentColors?.border || 'border-l-gray-400'}`
              }`}>
              <div className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </div>
              {message.sender === 'ai' && message.platform && (
                <div className={`mt-2 text-xs font-medium ${agentColors?.text || 'text-gray-600'}`}>
                  — {getPlatformName(message.platform)}
                </div>
              )}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          </div>
        );
      })}
      {isLoadingResponse && (
        <div className="flex flex-col items-start mb-4">
          <div className="bg-green-50 rounded-lg p-4 text-sm border-l-4 border-l-green-400">
            <div className="flex items-center gap-2 text-green-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Your RoboHerd agents are thinking...
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatMessages;
