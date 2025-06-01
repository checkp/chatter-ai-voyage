
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface QueuedMessage {
  id: string;
  chatId: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
}

export const useMessageQueue = () => {
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);

  const addToQueue = useCallback((chatId: string, content: string): string => {
    const messageId = uuidv4();
    const queuedMessage: QueuedMessage = {
      id: messageId,
      chatId,
      content,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    };

    setMessageQueue(prev => [...prev, queuedMessage]);
    console.log('Added message to queue:', messageId, content.substring(0, 50) + '...');
    return messageId;
  }, []);

  const updateMessageStatus = useCallback((messageId: string, status: QueuedMessage['status']) => {
    setMessageQueue(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
    console.log('Updated message status:', messageId, status);
  }, []);

  const removeFromQueue = useCallback((messageId: string) => {
    setMessageQueue(prev => prev.filter(msg => msg.id !== messageId));
    console.log('Removed message from queue:', messageId);
  }, []);

  const retryMessage = useCallback((messageId: string) => {
    setMessageQueue(prev => prev.map(msg => 
      msg.id === messageId ? { 
        ...msg, 
        status: 'pending', 
        retryCount: msg.retryCount + 1 
      } : msg
    ));
    console.log('Retrying message:', messageId);
  }, []);

  const clearQueue = useCallback(() => {
    setMessageQueue([]);
    console.log('Cleared message queue');
  }, []);

  const stopProcessing = useCallback(() => {
    setShouldStop(true);
    console.log('Stop signal sent to message processing');
  }, []);

  const resetStopSignal = useCallback(() => {
    setShouldStop(false);
  }, []);

  const getNextPendingMessage = useCallback(() => {
    return messageQueue.find(msg => msg.status === 'pending');
  }, [messageQueue]);

  const getPendingCount = useCallback(() => {
    return messageQueue.filter(msg => msg.status === 'pending').length;
  }, [messageQueue]);

  return {
    messageQueue,
    isProcessing,
    shouldStop,
    setIsProcessing,
    addToQueue,
    updateMessageStatus,
    removeFromQueue,
    retryMessage,
    clearQueue,
    stopProcessing,
    resetStopSignal,
    getNextPendingMessage,
    getPendingCount
  };
};
