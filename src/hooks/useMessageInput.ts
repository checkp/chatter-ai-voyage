
import { useState } from 'react';

export const useMessageInput = (handleSendMessage: (message: string) => void) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    handleSendMessage(input.trim());
    setInput('');
  };

  return {
    input,
    setInput,
    handleSend
  };
};
