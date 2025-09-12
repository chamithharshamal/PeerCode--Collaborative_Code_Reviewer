import { Server } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { WebSocketService } from '../../services/WebSocketService';
import { SessionService } from '../../services/SessionService';
import { UserService } from '../../services/UserService';
import { AnnotationService } from '../../services/AnnotationService';

describe('WebSocket Real-time Communication Integration Tests', () => {
  let httpServer: Server;
  let io: SocketIOServer;
  let webSocketService: WebSocketService;
  let sessionService: SessionService;
  let userService: UserService;
  let annotationService: AnnotationService;
  let clientSocket: ClientSocket;
  let serverSocket: any;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize services
    sessionService = new SessionService();
    userService = new UserService();
    annotationService = new AnnotationService();
    webSocketService = new WebSocketService(io, sessionService, userService, annotationService);

    // Start server
    httpServer.listen(3001, () => {
      done();
    });
  });

  afterAll((done) => {
    webSocketService.cleanup();
    io.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Create client connection
    clientSocket = Client('http://localhost:3001', {
      transports: ['websocket']
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should establish connection successfully', () => {
      expect(clientSocket.connected).toBe(true);
    });

    it('should handle heartbeat ping/pong', (done) => {
      clientSocket.on('heartbeat-ping', () => {
        clientSocket.emit('heartbeat');
      });

      clientSocket.on('heartbeat-ack', () => {
        done();
      });

      // Trigger heartbeat
      clientSocket.emit('heartbeat');
    });

    it('should track connection statistics', () => {
      const stats = webSocketService.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThan(0);
      expect(stats.activeSessions).toBeDefined();
    });
  });

  describe('Session Management', () => {
    let testUser: any;
    let testSession: any;

    beforeEach(async () => {
      // Create test user
      testUser = await userService.register({
        email: 'test@example.com',
        password: 'password123',
        username: 'Test User'
      });

      // Create test session
      testSession = await sessionService.createSession(
        testUser.id,
        'test-snippet-id',
        5
      );
    });

    it('should join session successfully', (done) => {
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser.id
      });

      clientSocket.on('session-joined', (data) => {
        expect(data.participants).toBeDefined();
        expect(data.sessionState).toBeDefined();
        expect(data.sessionState.session.id).toBe(testSession.id);
        done();
      });
    });

    it('should handle invalid session join', (done) => {
      clientSocket.emit('join-session', {
        sessionId: 'invalid-session-id',
        userId: testUser.id
      });

      clientSocket.on('error', (error) => {
        expect(error.code).toBe('SESSION_NOT_FOUND');
        done();
      });
    });

    it('should handle invalid user join', (done) => {
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: 'invalid-user-id'
      });

      clientSocket.on('error', (error) => {
        expect(error.code).toBe('USER_NOT_FOUND');
        done();
      });
    });
  });

  describe('Annotation Management', () => {
    let testUser: any;
    let testSession: any;

    beforeEach(async () => {
      testUser = await userService.register({
        email: 'annotation@example.com',
        password: 'password123',
        username: 'Annotation User'
      });

      testSession = await sessionService.createSession(
        testUser.id,
        'test-snippet-id',
        5
      );

      // Join session first
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser.id
      });
    });

    it('should add annotation successfully', (done) => {
      const annotationData = {
        sessionId: testSession.id,
        annotation: {
          lineStart: 1,
          lineEnd: 3,
          columnStart: 0,
          columnEnd: 10,
          content: 'This is a test annotation',
          type: 'comment' as const
        }
      };

      clientSocket.emit('add-annotation', annotationData);

      clientSocket.on('annotation-added', (data) => {
        expect(data.annotation.content).toBe('This is a test annotation');
        expect(data.userId).toBe(testUser.id);
        done();
      });
    });

    it('should update annotation successfully', async () => {
      // First add an annotation
      const annotation = await annotationService.createAnnotation({
        userId: testUser.id,
        sessionId: testSession.id,
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'Original content',
        type: 'comment'
      });

      const updateData = {
        sessionId: testSession.id,
        annotationId: annotation.id,
        updates: {
          content: 'Updated content',
          type: 'suggestion' as const
        }
      };

      const updatePromise = new Promise<void>((resolve) => {
        clientSocket.on('annotation-updated', (data) => {
          expect(data.annotation.content).toBe('Updated content');
          expect(data.annotation.type).toBe('suggestion');
          resolve();
        });
      });

      clientSocket.emit('update-annotation', updateData);
      await updatePromise;
    });

    it('should delete annotation successfully', async () => {
      // First add an annotation
      const annotation = await annotationService.createAnnotation({
        userId: testUser.id,
        sessionId: testSession.id,
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'To be deleted',
        type: 'comment'
      });

      const deleteData = {
        sessionId: testSession.id,
        annotationId: annotation.id
      };

      const deletePromise = new Promise<void>((resolve) => {
        clientSocket.on('annotation-deleted', (data) => {
          expect(data.annotationId).toBe(annotation.id);
          expect(data.userId).toBe(testUser.id);
          resolve();
        });
      });

      clientSocket.emit('delete-annotation', deleteData);
      await deletePromise;
    });
  });

  describe('Real-time Features', () => {
    let testUser: any;
    let testSession: any;

    beforeEach(async () => {
      testUser = await userService.register({
        email: 'realtime@example.com',
        password: 'password123',
        username: 'Real-time User'
      });

      testSession = await sessionService.createSession(
        testUser.id,
        'test-snippet-id',
        5
      );

      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser.id
      });
    });

    it('should handle typing indicators', (done) => {
      clientSocket.emit('typing-indicator', {
        sessionId: testSession.id,
        isTyping: true
      });

      clientSocket.on('typing-indicator', (data) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.isTyping).toBe(true);
        done();
      });
    });

    it('should handle code highlighting', (done) => {
      const highlightData = {
        sessionId: testSession.id,
        range: {
          startLine: 1,
          endLine: 5,
          startColumn: 0,
          endColumn: 20
        }
      };

      clientSocket.emit('highlight-code', highlightData);

      clientSocket.on('code-highlighted', (data) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.range).toEqual(highlightData.range);
        done();
      });
    });

    it('should request session state', (done) => {
      clientSocket.emit('request-session-state', {
        sessionId: testSession.id
      });

      clientSocket.on('session-state-update', (data) => {
        expect(data.participants).toBeDefined();
        expect(data.sessionState).toBeDefined();
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized annotation operations', (done) => {
      clientSocket.emit('add-annotation', {
        sessionId: 'some-session',
        annotation: {
          lineStart: 1,
          lineEnd: 3,
          columnStart: 0,
          columnEnd: 10,
          content: 'Unauthorized annotation',
          type: 'comment'
        }
      });

      clientSocket.on('error', (error) => {
        expect(error.code).toBe('UNAUTHORIZED');
        done();
      });
    });

    it('should handle connection errors gracefully', (done) => {
      // Simulate connection error
      clientSocket.emit('error', { message: 'Test error' });

      clientSocket.on('error', (error) => {
        expect(error.message).toBeDefined();
        done();
      });
    });
  });

  describe('Multiple Clients', () => {
    let testUser1: any;
    let testUser2: any;
    let testSession: any;
    let clientSocket2: ClientSocket;

    beforeEach(async () => {
      testUser1 = await userService.register({
        email: 'user1@example.com',
        password: 'password123',
        username: 'User 1'
      });

      testUser2 = await userService.register({
        email: 'user2@example.com',
        password: 'password123',
        username: 'User 2'
      });

      testSession = await sessionService.createSession(
        testUser1.id,
        'test-snippet-id',
        5
      );

      // Create second client
      clientSocket2 = Client('http://localhost:3001', {
        transports: ['websocket']
      });
    });

    afterEach(() => {
      if (clientSocket2.connected) {
        clientSocket2.disconnect();
      }
    });

    it('should broadcast user join to other participants', (done) => {
      // First user joins
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser1.id
      });

      // Second user joins
      clientSocket2.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser2.id
      });

      // First user should be notified about second user joining
      clientSocket.on('user-joined', (data) => {
        expect(data.user.id).toBe(testUser2.id);
        expect(data.participants).toHaveLength(2);
        done();
      });
    });

    it('should broadcast annotations to all participants', (done) => {
      // Both users join
      clientSocket.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser1.id
      });

      clientSocket2.emit('join-session', {
        sessionId: testSession.id,
        userId: testUser2.id
      });

      // Wait for both to join, then add annotation
      setTimeout(() => {
        clientSocket.emit('add-annotation', {
          sessionId: testSession.id,
          annotation: {
            lineStart: 1,
            lineEnd: 3,
            columnStart: 0,
            columnEnd: 10,
            content: 'Broadcast annotation',
            type: 'comment'
          }
        });
      }, 100);

      // Second user should receive the annotation
      clientSocket2.on('annotation-added', (data) => {
        expect(data.annotation.content).toBe('Broadcast annotation');
        expect(data.userId).toBe(testUser1.id);
        done();
      });
    });
  });
});
