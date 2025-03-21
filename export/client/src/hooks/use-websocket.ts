import { useState, useEffect, useCallback, useRef } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

interface UseWebSocketProps {
  url: string;
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  autoConnect?: boolean;
}

/**
 * Custom hook for managing WebSocket connections
 */
export function useWebSocket({
  url,
  onOpen,
  onMessage,
  onClose,
  onError,
  reconnectInterval = 5000,
  reconnectAttempts = 10,
  autoConnect = true,
}: UseWebSocketProps) {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const attemptRef = useRef(0);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Clear any existing reconnect timers
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setStatus('connecting');
    
    // Ensure correct WebSocket protocol is used
    let wsUrl = url;
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${url.startsWith('/') ? window.location.host + url : url}`;
    }
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = (event) => {
      setStatus('open');
      attemptRef.current = 0;
      if (onOpen) onOpen(event);
    };
    
    ws.onmessage = (event) => {
      setLastMessage(event);
      if (onMessage) onMessage(event);
    };
    
    ws.onclose = (event) => {
      setStatus('closed');
      wsRef.current = null;
      
      if (onClose) onClose(event);
      
      // Attempt to reconnect if we haven't exceeded max attempts
      if (attemptRef.current < reconnectAttempts) {
        attemptRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };
    
    ws.onerror = (event) => {
      setStatus('error');
      if (onError) onError(event);
    };
  }, [url, onOpen, onMessage, onClose, onError, reconnectAttempts, reconnectInterval]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      setStatus('closing');
      wsRef.current.close();
    }
    
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  // Send message to WebSocket
  const sendMessage = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    }
    return false;
  }, []);
  
  // Send JSON message to WebSocket
  const sendJsonMessage = useCallback((data: any) => {
    console.log('Attempting to send JSON message:', data);
    const jsonString = JSON.stringify(data);
    console.log('Stringified message:', jsonString);
    const result = sendMessage(jsonString);
    console.log('Message sent result:', result);
    return result;
  }, [sendMessage]);
  
  // Connect on mount and disconnect on unmount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);
  
  return { 
    status, 
    lastMessage, 
    sendMessage, 
    sendJsonMessage, 
    connect, 
    disconnect 
  };
}