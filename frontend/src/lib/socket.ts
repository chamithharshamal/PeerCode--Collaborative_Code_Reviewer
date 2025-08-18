import io from 'socket.io-client';
import { Annotation, CodeRange } from '@/types';

interface SocketInstance {
  emit: (event: string, data: unknown) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  disconnect: () => void;
}

class SocketManager {
  private socket: SocketInstance | null = null;
  private serverUrl: string;

  constructor() {
    this.serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
  }

  connect() {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
      }) as SocketInstance;

      this.socket.on('connect', () => {
        console.log('Connected to server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      this.socket.on('error', (data: unknown) => {
        console.error('Socket error:', data);
      });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Helper methods for common socket operations
  joinSession(sessionId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('join-session', { sessionId, userId });
    }
  }

  addAnnotation(sessionId: string, annotation: Annotation) {
    if (this.socket) {
      this.socket.emit('add-annotation', { sessionId, annotation });
    }
  }

  highlightCode(sessionId: string, range: CodeRange) {
    if (this.socket) {
      this.socket.emit('highlight-code', { sessionId, range });
    }
  }

  sendTypingIndicator(sessionId: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit('typing-indicator', { sessionId, isTyping });
    }
  }
}

export const socketManager = new SocketManager();
export default socketManager;