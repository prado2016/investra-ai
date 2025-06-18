/**
 * WebSocket Hook for Real-time Email Processing Updates
 * Provides real-time updates for email processing status
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'email_processing_started' | 'email_processing_completed' | 'email_processing_failed' | 'system_status' | 'connection_test';
  data: any;
  timestamp: string;
  id: string;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  messages: WebSocketMessage[];
}

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxMessages?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:3002',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    maxMessages = 100
  } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
    messages: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null
        }));
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          setState(prev => ({
            ...prev,
            lastMessage: message,
            messages: [message, ...prev.messages].slice(0, maxMessages)
          }));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false
        }));

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          connecting: false
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        connecting: false
      }));
    }
  }, [url, reconnectAttempts, reconnectInterval, maxMessages]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      connected: false,
      connecting: false
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      lastMessage: null
    }));
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    clearMessages,
    sendMessage,
    reconnectCount: reconnectCountRef.current
  };
}

// Specialized hook for email processing updates
export function useEmailProcessingWebSocket() {
  const webSocket = useWebSocket({
    url: 'ws://localhost:3002',
    autoConnect: true,
    maxMessages: 50
  });

  const emailProcessingMessages = webSocket.messages.filter(msg => 
    msg.type.startsWith('email_processing_') || msg.type === 'connection_test'
  );

  const latestProcessingStatus = emailProcessingMessages[0];

  return {
    ...webSocket,
    emailProcessingMessages,
    latestProcessingStatus,
    isProcessing: latestProcessingStatus?.type === 'email_processing_started',
    lastProcessingResult: emailProcessingMessages.find(msg => 
      msg.type === 'email_processing_completed' || msg.type === 'email_processing_failed'
    )
  };
}

export default useWebSocket;
