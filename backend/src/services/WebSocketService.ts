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

      socket.on('highlight-code', (data) => {
        this.handleHighlightCode(socket, data);
      });

      socket.on('typing-indicator', (data) => {
        this.handleTypingIndicator(socket, data);
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
    data: { sessionId: string; annotation: Annotation }
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

      // Save annotation using AnnotationService
      const newAnnotation = await this.annotationService.addAnnotation(sessionId, {
        ...annotation,
        userId,
        sessionId,
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

  // Get connection statistics
  public getConnectionStats(): {
    totalConnections: number;
    activeSessions: number;
    sessionsWithUsers: { [sessionId: string]: number };
  } {
    const sessionsWithUsers: { [sessionId: string]: number } = {};
    
    for (const [sessionId, sockets] of this.activeSessions.entries()) {
      sessionsWithUsers[sessionId] = sockets.size;
    }

    return {
      totalConnections: this.io.engine.clientsCount,
      activeSessions: this.activeSessions.size,
      sessionsWithUsers,
    };
  }
}