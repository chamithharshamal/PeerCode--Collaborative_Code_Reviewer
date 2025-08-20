import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const connect = useCallback(() => {
    if (!socketRef.current && user) {
      setConnectionStatus('connecting');
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
      
      socketRef.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
        auth: {
          userId: user.id,
        },
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to server');
        setConnectionStatus('connected');
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setConnectionStatus('disconnected');
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
      });

      socketRef.current.on('error', (data) => {
        console.error('Socket error:', data);
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server after', attemptNumber, 'attempts');
        setConnectionStatus('connected');
      });

      socketRef.current.on('reconnect_attempt', (attemptNumber) => {
        console.log('Attempting to reconnect...', attemptNumber);
        setConnectionStatus('reconnecting');
      });

      socketRef.current.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
      });

      socketRef.current.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server');
        setConnectionStatus('disconnected');
      });
    }
  }, [user, reconnection, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus('disconnected');
    }
  }, []);

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

  return {
    socket: socketRef.current,
    connected: socketRef.current?.connected || false,
    connectionStatus,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
};