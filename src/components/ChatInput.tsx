
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Send, RefreshCw } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
  isLoadingResponse: boolean;
  isPending: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSend,
  isLoadingResponse,
  isPending
}) => {
  return (
    <footer className="border-t bg-secondary border-border p-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message here..."
          className="flex-1 resize-none"
          disabled={isLoadingResponse || isPending}
        />
        <Button 
          onClick={handleSend} 
          disabled={isLoadingResponse || isPending || !input.trim()}
        >
          {(isLoadingResponse || isPending) ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send
        </Button>
      </div>
    </footer>
  );
};

export default ChatInput;
