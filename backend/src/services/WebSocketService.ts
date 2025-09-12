import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket';
import { SessionService } from './SessionService';
import { UserService } from './UserService';
import { AnnotationService } from './AnnotationService';
import { User, Annotation, SessionState } from '../types';

export class WebSocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private sessionService: SessionService;
  private userService: UserService;
  private annotationService: AnnotationService;
  private activeSessions: Map<string, Set<string>> = new Map(); // sessionId -> Set of socketIds
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private typingUsers: Map<string, Set<string>> = new Map(); // sessionId -> Set of userIds
  private connectionAttempts: Map<string, number> = new Map(); // socketId -> attempt count
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    sessionService: SessionService,
    userService: UserService,
    annotationService?: AnnotationService
  ) {
    this.io = io;
    this.sessionService = sessionService;
    this.userService = userService;
    this.annotationService = annotationService || new AnnotationService();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('join-session', async (data) => {
        await this.handleJoinSession(socket, data);
      });

      socket.on('add-annotation', async (data) => {
        await this.handleAddAnnotation(socket, data);
      });

      socket.on('update-annotation', async (data) => {
        await this.handleUpdateAnnotation(socket, data);
      });

      socket.on('delete-annotation', async (data) => {
        await this.handleDeleteAnnotation(socket, data);
      });

      socket.on('request-annotations', async (data) => {
        await this.handleRequestAnnotations(socket, data);
      });

      socket.on('search-annotations', async (data) => {
        await this.handleSearchAnnotations(socket, data);
      });

      socket.on('annotation-focus', (data) => {
        this.handleAnnotationFocus(socket, data);
      });

      socket.on('annotation-resolve', async (data) => {
        await this.handleAnnotationResolve(socket, data);
      });

      socket.on('highlight-code', (data) => {
        this.handleHighlightCode(socket, data);
      });

      socket.on('typing-indicator', (data) => {
        this.handleTypingIndicator(socket, data);
      });

      socket.on('heartbeat', () => {
        this.handleHeartbeat(socket);
      });

      socket.on('request-session-state', (data) => {
        this.handleRequestSessionState(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        socket.emit('error', {
          message: 'Connection error occurred',
          code: 'CONNECTION_ERROR',
        });
      });
    });
  }

  private async handleJoinSession(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string; userId: string }
  ): Promise<void> {
    try {
      const { sessionId, userId } = data;

      // Validate session exists
      const sessionState = await this.sessionService.getSessionState(sessionId);
      if (!sessionState) {
        socket.emit('error', {
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        });
        return;
      }

      // Get user information
      const user = await this.userService.getUserById(userId);
      if (!user) {
        socket.emit('error', {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Store socket data
      socket.data.userId = userId;
      socket.data.sessionId = sessionId;

      // Join socket room
      socket.join(sessionId);

      // Track active sessions and users
      if (!this.activeSessions.has(sessionId)) {
        this.activeSessions.set(sessionId, new Set());
      }
      this.activeSessions.get(sessionId)!.add(socket.id);
      this.userSockets.set(userId, socket.id);

      // Add user to session participants
      await this.sessionService.joinSession(sessionId, userId);

      // Get updated session state with participants
      const updatedSessionState = await this.sessionService.getSessionState(sessionId);
      const participants = await this.getSessionParticipants(sessionId);

      // Notify user they joined successfully
      socket.emit('session-joined', {
        participants,
        sessionState: updatedSessionState!,
      });

      // Notify other participants about new user
      socket.to(sessionId).emit('user-joined', {
        user,
        participants,
      });

      console.log(`User ${userId} joined session ${sessionId}`);
    } catch (error) {
      console.error('Error handling join session:', error);
      socket.emit('error', {
        message: 'Failed to join session',
        code: 'JOIN_SESSION_ERROR',
      });
    }
  }

  private async handleAddAnnotation(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { 
      sessionId: string; 
      annotation: {
        lineStart: number;
        lineEnd: number;
        columnStart: number;
        columnEnd: number;
        content: string;
        type: 'comment' | 'suggestion' | 'question';
      }
    }
  ): Promise<void> {
    try {
      const { sessionId, annotation } = data;
      const userId = socket.data.userId;

      if (!userId || socket.data.sessionId !== sessionId) {
        socket.emit('error', {
          message: 'Unauthorized to add annotation',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Create annotation using the new AnnotationService
      const newAnnotation = await this.annotationService.createAnnotation({
        userId,
        sessionId,
        lineStart: annotation.lineStart,
        lineEnd: annotation.lineEnd,
        columnStart: annotation.columnStart,
        columnEnd: annotation.columnEnd,
        content: annotation.content,
        type: annotation.type,
      });

      // Broadcast to all participants in the session
      this.io.to(sessionId).emit('annotation-added', {
        annotation: newAnnotation,
        userId,
      });

      console.log(`Annotation added in session ${sessionId} by user ${userId}`);
    } catch (error) {
      console.error('Error handling add annotation:', error);
      socket.emit('error', {
        message: 'Failed to add annotation',
        code: 'ADD_ANNOTATION_ERROR',
      });
    }
  }

  private async handleUpdateAnnotation(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { 
      sessionId: string; 
      annotationId: string;
      updates: {
        content?: string;
        type?: 'comment' | 'suggestion' | 'question';
        lineStart?: number;
        lineEnd?: number;
        columnStart?: number;
        columnEnd?: number;
      }
    }
  ): Promise<void> {
    try {
      const { sessionId, annotationId, updates } = data;
      const userId = socket.data.userId;

      if (!userId || socket.data.sessionId !== sessionId) {
        socket.emit('error', {
          message: 'Unauthorized to update annotation',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Check if user owns the annotation
      const existingAnnotation = await this.annotationService.getAnnotation(annotationId);
      if (!existingAnnotation || existingAnnotation.userId !== userId) {
        socket.emit('error', {
          message: 'Annotation not found or access denied',
          code: 'ANNOTATION_ACCESS_DENIED',
        });
        return;
      }

      // Update annotation
      const updatedAnnotation = await this.annotationService.updateAnnotation(annotationId, updates);

      // Broadcast to all participants in the session
      this.io.to(sessionId).emit('annotation-updated', {
        annotation: updatedAnnotation,
        userId,
      });

      console.log(`Annotation ${annotationId} updated in session ${sessionId} by user ${userId}`);
    } catch (error) {
      console.error('Error handling update annotation:', error);
      socket.emit('error', {
        message: 'Failed to update annotation',
        code: 'UPDATE_ANNOTATION_ERROR',
      });
    }
  }

  private async handleDeleteAnnotation(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string; annotationId: string }
  ): Promise<void> {
    try {
      const { sessionId, annotationId } = data;
      const userId = socket.data.userId;

      if (!userId || socket.data.sessionId !== sessionId) {
        socket.emit('error', {
          message: 'Unauthorized to delete annotation',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Check if user owns the annotation
      const existingAnnotation = await this.annotationService.getAnnotation(annotationId);
      if (!existingAnnotation || existingAnnotation.userId !== userId) {
        socket.emit('error', {
          message: 'Annotation not found or access denied',
          code: 'ANNOTATION_ACCESS_DENIED',
        });
        return;
      }

      // Delete annotation
      const deleted = await this.annotationService.deleteAnnotation(annotationId);
      
      if (!deleted) {
        socket.emit('error', {
          message: 'Failed to delete annotation',
          code: 'DELETE_ANNOTATION_ERROR',
        });
        return;
      }

      // Broadcast to all participants in the session
      this.io.to(sessionId).emit('annotation-deleted', {
        annotationId,
        userId,
      });

      console.log(`Annotation ${annotationId} deleted in session ${sessionId} by user ${userId}`);
    } catch (error) {
      console.error('Error handling delete annotation:', error);
      socket.emit('error', {
        message: 'Failed to delete annotation',
        code: 'DELETE_ANNOTATION_ERROR',
      });
    }
  }

  private handleHighlightCode(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string; range: any }
  ): void {
    const { sessionId, range } = data;
    const userId = socket.data.userId;

    if (!userId || socket.data.sessionId !== sessionId) {
      socket.emit('error', {
        message: 'Unauthorized to highlight code',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Broadcast to other participants (not the sender)
    socket.to(sessionId).emit('code-highlighted', {
      range,
      userId,
    });

    console.log(`Code highlighted in session ${sessionId} by user ${userId}`);
  }

  private handleTypingIndicator(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string; isTyping: boolean }
  ): void {
    const { sessionId, isTyping } = data;
    const userId = socket.data.userId;

    if (!userId || socket.data.sessionId !== sessionId) {
      return;
    }

    // Track typing users
    if (!this.typingUsers.has(sessionId)) {
      this.typingUsers.set(sessionId, new Set());
    }

    const typingSet = this.typingUsers.get(sessionId)!;
    
    if (isTyping) {
      typingSet.add(userId);
    } else {
      typingSet.delete(userId);
    }

    // Broadcast to other participants
    socket.to(sessionId).emit('typing-indicator', {
      userId,
      isTyping,
    });

    console.log(`Typing indicator: ${userId} is ${isTyping ? 'typing' : 'not typing'} in session ${sessionId}`);
  }

  private async handleDisconnect(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ): Promise<void> {
    const { userId, sessionId } = socket.data;

    console.log(`User disconnected: ${socket.id}`);

    if (sessionId && userId) {
      try {
        // Remove from active sessions tracking
        const sessionSockets = this.activeSessions.get(sessionId);
        if (sessionSockets) {
          sessionSockets.delete(socket.id);
          if (sessionSockets.size === 0) {
            this.activeSessions.delete(sessionId);
          }
        }

        // Remove from user sockets mapping
        this.userSockets.delete(userId);

        // Remove from typing users
        const typingSet = this.typingUsers.get(sessionId);
        if (typingSet) {
          typingSet.delete(userId);
        }

        // Leave session
        await this.sessionService.leaveSession(sessionId, userId);

        // Get updated participants list
        const participants = await this.getSessionParticipants(sessionId);

        // Notify other participants about user leaving
        socket.to(sessionId).emit('user-left', {
          userId,
          participants,
        });

        console.log(`User ${userId} left session ${sessionId}`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
  }

  private async getSessionParticipants(sessionId: string): Promise<User[]> {
    try {
      const sessionState = await this.sessionService.getSessionState(sessionId);
      if (!sessionState) {
        return [];
      }

      const participants: User[] = [];
      for (const participantId of sessionState.session.participants) {
        const user = await this.userService.getUserById(participantId);
        if (user) {
          participants.push(user);
        }
      }

      return participants;
    } catch (error) {
      console.error('Error getting session participants:', error);
      return [];
    }
  }

  // Public methods for external services to emit events
  public async broadcastAIAnalysis(sessionId: string, suggestions: any[]): Promise<void> {
    this.io.to(sessionId).emit('ai-analysis-complete', { suggestions });
  }

  public async broadcastDebateArguments(sessionId: string, debateArguments: any): Promise<void> {
    this.io.to(sessionId).emit('debate-arguments', { arguments: debateArguments });
  }

  public async broadcastDebateResponse(sessionId: string, response: any): Promise<void> {
    this.io.to(sessionId).emit('debate-response', { response });
  }

  private handleHeartbeat(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ): void {
    // Reset connection attempts on successful heartbeat
    this.connectionAttempts.delete(socket.id);
    socket.emit('heartbeat-ack');
  }

  private async handleRequestSessionState(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string }
  ): Promise<void> {
    try {
      const { sessionId } = data;
      const userId = socket.data.userId;

      if (!userId || socket.data.sessionId !== sessionId) {
        socket.emit('error', {
          message: 'Unauthorized to request session state',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const sessionState = await this.sessionService.getSessionState(sessionId);
      const participants = await this.getSessionParticipants(sessionId);

      if (sessionState) {
        socket.emit('session-state-update', {
          participants,
          sessionState,
        });
      }
    } catch (error) {
      console.error('Error handling request session state:', error);
      socket.emit('error', {
        message: 'Failed to get session state',
        code: 'SESSION_STATE_ERROR',
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.io.emit('heartbeat-ping');
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async handleRequestAnnotations(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string; lineRange?: { start: number; end: number } }
  ): Promise<void> {
    try {
      const { sessionId, lineRange } = data;
      const userId = socket.data.userId;

      if (!userId || socket.data.sessionId !== sessionId) {
        socket.emit('error', {
          message: 'Unauthorized to request annotations',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      let annotations;
      if (lineRange) {
        annotations = await this.annotationService.getAnnotationsByLineRange(
          sessionId,
          lineRange.start,
          lineRange.end
        );
      } else {
        annotations = await this.annotationService.getSessionAnnotations(sessionId);
      }

      socket.emit('annotations-loaded', {
        annotations,
        sessionId,
      });

      console.log(`Annotations requested for session ${sessionId} by user ${userId}`);
    } catch (error) {
      console.error('Error handling request annotations:', error);
      socket.emit('error', {
        message: 'Failed to load annotations',
        code: 'LOAD_ANNOTATIONS_ERROR',
      });
    }
  }

  private async handleSearchAnnotations(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { 
      sessionId: string; 
      query: string; 
      type?: 'comment' | 'suggestion' | 'question';
      userId?: string;
    }
  ): Promise<void> {
    try {
      const { sessionId, query, type, userId: searchUserId } = data;
      const requestingUserId = socket.data.userId;

      if (!requestingUserId || socket.data.sessionId !== sessionId) {
        socket.emit('error', {
          message: 'Unauthorized to search annotations',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Users can only search their own annotations unless they're searching all
      const searchParams = {
        query,
        sessionId,
        type,
        userId: searchUserId || requestingUserId
      };

      const annotations = await this.annotationService.searchAnnotations(searchParams);

      socket.emit('annotations-search-results', {
        annotations,
        query,
        sessionId,
      });

      console.log(`Annotations searched in session ${sessionId} by user ${requestingUserId}`);
    } catch (error) {
      console.error('Error handling search annotations:', error);
      socket.emit('error', {
        message: 'Failed to search annotations',
        code: 'SEARCH_ANNOTATIONS_ERROR',
      });
    }
  }

  private handleAnnotationFocus(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string; annotationId: string; focused: boolean }
  ): void {
    const { sessionId, annotationId, focused } = data;
    const userId = socket.data.userId;

    if (!userId || socket.data.sessionId !== sessionId) {
      socket.emit('error', {
        message: 'Unauthorized to focus annotation',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Broadcast to other participants (not the sender)
    socket.to(sessionId).emit('annotation-focus-changed', {
      annotationId,
      userId,
      focused,
    });

    console.log(`Annotation ${annotationId} focus changed in session ${sessionId} by user ${userId}`);
  }

  private async handleAnnotationResolve(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    data: { sessionId: string; annotationId: string; resolved: boolean }
  ): Promise<void> {
    try {
      const { sessionId, annotationId, resolved } = data;
      const userId = socket.data.userId;

      if (!userId || socket.data.sessionId !== sessionId) {
        socket.emit('error', {
          message: 'Unauthorized to resolve annotation',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Check if user owns the annotation
      const existingAnnotation = await this.annotationService.getAnnotation(annotationId);
      if (!existingAnnotation || existingAnnotation.userId !== userId) {
        socket.emit('error', {
          message: 'Annotation not found or access denied',
          code: 'ANNOTATION_ACCESS_DENIED',
        });
        return;
      }

      // Update annotation with resolved status
      const updatedAnnotation = await this.annotationService.updateAnnotation(annotationId, {
        // Add resolved field to content or use a separate field
        content: existingAnnotation.content + (resolved ? ' [RESOLVED]' : ''),
      });

      // Broadcast to all participants in the session
      this.io.to(sessionId).emit('annotation-resolved', {
        annotation: updatedAnnotation,
        userId,
        resolved,
      });

      console.log(`Annotation ${annotationId} ${resolved ? 'resolved' : 'unresolved'} in session ${sessionId} by user ${userId}`);
    } catch (error) {
      console.error('Error handling annotation resolve:', error);
      socket.emit('error', {
        message: 'Failed to resolve annotation',
        code: 'RESOLVE_ANNOTATION_ERROR',
      });
    }
  }

  // Enhanced connection management
  public async handleConnectionError(socketId: string, error: any): Promise<void> {
    const attempts = this.connectionAttempts.get(socketId) || 0;
    this.connectionAttempts.set(socketId, attempts + 1);

    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.log(`Max reconnection attempts reached for socket ${socketId}`);
      this.connectionAttempts.delete(socketId);
    }
  }

  // Get connection statistics
  public getConnectionStats(): {
    totalConnections: number;
    activeSessions: number;
    sessionsWithUsers: { [sessionId: string]: number };
    connectionAttempts: { [socketId: string]: number };
  } {
    const sessionsWithUsers: { [sessionId: string]: number } = {};
    const connectionAttempts: { [socketId: string]: number } = {};
    
    for (const [sessionId, sockets] of this.activeSessions.entries()) {
      sessionsWithUsers[sessionId] = sockets.size;
    }

    for (const [socketId, attempts] of this.connectionAttempts.entries()) {
      connectionAttempts[socketId] = attempts;
    }

    return {
      totalConnections: this.io.engine.clientsCount,
      activeSessions: this.activeSessions.size,
      sessionsWithUsers,
      connectionAttempts,
    };
  }

  // Cleanup method
  public cleanup(): void {
    this.stopHeartbeat();
    this.activeSessions.clear();
    this.userSockets.clear();
    this.typingUsers.clear();
    this.connectionAttempts.clear();
  }
}