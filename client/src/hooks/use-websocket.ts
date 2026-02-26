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
  const onOpenRef = useRef(onOpen);
  const onMessageRef = useRef(onMessage);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  onOpenRef.current = onOpen;
  onMessageRef.current = onMessage;
  onCloseRef.current = onClose;
  onErrorRef.current = onError;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setStatus('connecting');

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
      if (onOpenRef.current) onOpenRef.current(event);
    };

    ws.onmessage = (event) => {
      setLastMessage(event);
      if (onMessageRef.current) onMessageRef.current(event);
    };

    ws.onclose = (event) => {
      setStatus('closed');
      wsRef.current = null;

      if (onCloseRef.current) onCloseRef.current(event);

      if (attemptRef.current < reconnectAttempts) {
        attemptRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (event) => {
      setStatus('error');
      if (onErrorRef.current) onErrorRef.current(event);
    };
  }, [url, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      setStatus('closing');
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    }
    return false;
  }, []);

  const sendJsonMessage = useCallback((data: any) => {
    console.log('Attempting to send JSON message:', data);
    const jsonString = JSON.stringify(data);
    const result = sendMessage(jsonString);
    console.log('Message sent result:', result);
    return result;
  }, [sendMessage]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url]);

  return {
    status,
    lastMessage,
    sendMessage,
    sendJsonMessage,
    connect,
    disconnect
  };
}
