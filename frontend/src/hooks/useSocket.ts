import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../lib/auth-context';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  heartbeatInterval?: number;
}

interface ConnectionStats {
  connectionTime: Date | null;
  reconnectAttempts: number;
  lastError: string | null;
  latency: number | null;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    connectionTime: null,
    reconnectAttempts: 0,
    lastError: null,
    latency: null,
  });
  
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    heartbeatInterval = 30000,
  } = options;

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        lastPingTimeRef.current = Date.now();
        socketRef.current.emit('heartbeat');
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!socketRef.current && user) {
      setConnectionStatus('connecting');
      setConnectionStats(prev => ({ ...prev, lastError: null }));
      
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
      
      socketRef.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
        timeout: 10000,
        auth: {
          userId: user.id,
        },
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to server');
        setConnectionStatus('connected');
        setConnectionStats(prev => ({
          ...prev,
          connectionTime: new Date(),
          reconnectAttempts: 0,
          lastError: null,
        }));
        startHeartbeat();
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setConnectionStatus('disconnected');
        stopHeartbeat();
        
        // Update connection stats
        setConnectionStats(prev => ({
          ...prev,
          lastError: `Disconnected: ${reason}`,
        }));

        // Attempt to reconnect for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              socketRef.current.connect();
            }
          }, 1000);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnectionStatus('disconnected');
        setConnectionStats(prev => ({
          ...prev,
          lastError: `Connection error: ${error.message}`,
        }));
      });

      socketRef.current.on('error', (data) => {
        console.error('Socket error:', data);
        setConnectionStats(prev => ({
          ...prev,
          lastError: `Socket error: ${data.message || 'Unknown error'}`,
        }));
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server after', attemptNumber, 'attempts');
        setConnectionStatus('connected');
        setConnectionStats(prev => ({
          ...prev,
          connectionTime: new Date(),
          reconnectAttempts: attemptNumber,
          lastError: null,
        }));
        startHeartbeat();
      });

      socketRef.current.on('reconnect_attempt', (attemptNumber) => {
        console.log('Attempting to reconnect...', attemptNumber);
        setConnectionStatus('reconnecting');
        setConnectionStats(prev => ({
          ...prev,
          reconnectAttempts: attemptNumber,
        }));
      });

      socketRef.current.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
        setConnectionStats(prev => ({
          ...prev,
          lastError: `Reconnection error: ${error.message}`,
        }));
      });

      socketRef.current.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server');
        setConnectionStatus('disconnected');
        setConnectionStats(prev => ({
          ...prev,
          lastError: 'Failed to reconnect after maximum attempts',
        }));
      });

      // Handle heartbeat
      socketRef.current.on('heartbeat-ping', () => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('heartbeat');
        }
      });

      socketRef.current.on('heartbeat-ack', () => {
        if (lastPingTimeRef.current) {
          const latency = Date.now() - lastPingTimeRef.current;
          setConnectionStats(prev => ({
            ...prev,
            latency,
          }));
        }
      });

      // Handle connection status updates
      socketRef.current.on('connection-status', (data) => {
        console.log('Connection status update:', data);
        if (data.status === 'disconnected') {
          setConnectionStatus('disconnected');
        }
      });
    }
  }, [user, reconnection, reconnectionAttempts, reconnectionDelay, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      stopHeartbeat();
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus('disconnected');
      setConnectionStats(prev => ({
        ...prev,
        connectionTime: null,
        latency: null,
      }));
    }
  }, [stopHeartbeat]);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  useEffect(() => {
    if (autoConnect && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user, connect, disconnect]);

  // Cleanup heartbeat on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    socket: socketRef.current,
    connected: socketRef.current?.connected || false,
    connectionStatus,
    connectionStats,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
};