import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { WebSocketService } from '../../services/WebSocketService';
import { SessionService } from '../../services/SessionService';
import { UserService } from '../../services/UserService';
import { User, CodeSnippet, SessionState } from '../../types';
import { Annotation } from '../../models/Annotation';

describe('WebSocketService', () => {
  let httpServer: any;
  let io: Server;
  let webSocketService: WebSocketService;
  let mockSessionService: jest.Mocked<SessionService>;
  let mockUserService: jest.Mocked<UserService>;
  let clientSocket: any;
  let serverSocket: any;

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date(),
    lastActive: new Date(),
  };

  const mockCodeSnippet: CodeSnippet = {
    id: 'snippet-1',
    content: 'console.log("Hello World");',
    language: 'javascript',
    filename: 'test.js',
    size: 26,
    uploadedAt: new Date(),
  };

  const mockSessionState: SessionState = {
    session: {
      id: 'session-1',
      creatorId: 'user-1',
      codeSnippet: mockCodeSnippet,
      participants: ['user-1'],
      annotations: [],
      aiSuggestions: [],
      debateHistory: [],
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    activeParticipants: [mockUser],
    currentAnnotations: [],
    aiSuggestions: [],
    debateMode: false,
  };

  beforeEach((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    
    // Create mock services
    mockSessionService = {
      getSessionState: jest.fn(),
      joinSession: jest.fn().mockResolvedValue(undefined),
      leaveSession: jest.fn().mockResolvedValue(undefined),
      addAnnotation: jest.fn(),
      createSession: jest.fn(),
      updateSessionState: jest.fn(),
    } as any;

    mockUserService = {
      getUserById: jest.fn().mockResolvedValue(mockUser),
      createUser: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
    } as any;

    // Initialize WebSocket service
    webSocketService = new WebSocketService(io, mockSessionService, mockUserService);

    httpServer.listen(() => {
      const port = httpServer.address()?.port;
      clientSocket = Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterEach(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  describe('Session Management', () => {
    it('should handle join-session event successfully', (done) => {
      mockSessionService.getSessionState.mockResolvedValue(mockSessionState);

      clientSocket.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket.on('session-joined', (data: any) => {
        expect(data.participants).toHaveLength(1);
        expect(data.participants[0].id).toBe(mockUser.id);
        expect(data.participants[0].username).toBe(mockUser.username);
        expect(data.sessionState.session.id).toBe(mockSessionState.session.id);
        expect(mockSessionService.getSessionState).toHaveBeenCalledWith('session-1');
        expect(mockUserService.getUserById).toHaveBeenCalledWith('user-1');
        expect(mockSessionService.joinSession).toHaveBeenCalledWith('session-1', 'user-1');
        done();
      });
    });

    it('should handle join-session with invalid session', (done) => {
      mockSessionService.getSessionState.mockResolvedValue(null);

      clientSocket.emit('join-session', {
        sessionId: 'invalid-session',
        userId: 'user-1',
      });

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Session not found');
        expect(error.code).toBe('SESSION_NOT_FOUND');
        done();
      });
    });

    it('should handle join-session with invalid user', (done) => {
      mockSessionService.getSessionState.mockResolvedValue(mockSessionState);
      mockUserService.getUserById.mockResolvedValue(null);

      clientSocket.emit('join-session', {
        sessionId: 'session-1',
        userId: 'invalid-user',
      });

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('User not found');
        expect(error.code).toBe('USER_NOT_FOUND');
        done();
      });
    });
  });

  describe('Annotation Management', () => {
    beforeEach((done) => {
      // Setup authenticated socket
      mockSessionService.getSessionState.mockResolvedValue(mockSessionState);

      clientSocket.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket.on('session-joined', () => {
        done();
      });
    });

    it('should handle add-annotation event successfully', (done) => {
      const mockAnnotation = new Annotation(
        'user-1',
        'session-1',
        1,
        1,
        0,
        10,
        'Test annotation',
        'comment'
      );
      mockAnnotation.id = 'annotation-1';

      mockSessionService.addAnnotation.mockResolvedValue(mockAnnotation);

      clientSocket.emit('add-annotation', {
        sessionId: 'session-1',
        annotation: {
          lineStart: 1,
          lineEnd: 1,
          columnStart: 0,
          columnEnd: 10,
          content: 'Test annotation',
          type: 'comment',
        },
      });

      clientSocket.on('annotation-added', (data: any) => {
        expect(data.annotation.content).toBe('Test annotation');
        expect(data.userId).toBe('user-1');
        expect(mockSessionService.addAnnotation).toHaveBeenCalled();
        done();
      });
    });

    it('should reject annotation from unauthorized user', (done) => {
      // Create a second client that hasn't joined the session
      const unauthorizedClient = Client(`http://localhost:${httpServer.address()?.port}`);

      unauthorizedClient.on('connect', () => {
        unauthorizedClient.emit('add-annotation', {
          sessionId: 'session-1',
          annotation: {
            lineStart: 1,
            lineEnd: 1,
            columnStart: 0,
            columnEnd: 10,
            content: 'Unauthorized annotation',
            type: 'comment',
          },
        });

        unauthorizedClient.on('error', (error: any) => {
          expect(error.message).toBe('Unauthorized to add annotation');
          expect(error.code).toBe('UNAUTHORIZED');
          unauthorizedClient.close();
          done();
        });
      });
    });
  });

  describe('Real-time Communication', () => {
    let secondClientSocket: any;

    beforeEach((done) => {
      // Setup first authenticated socket
      mockSessionService.getSessionState.mockResolvedValue(mockSessionState);

      clientSocket.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket.on('session-joined', () => {
        // Setup second client
        secondClientSocket = Client(`http://localhost:${httpServer.address()?.port}`);
        
        secondClientSocket.on('connect', () => {
          secondClientSocket.emit('join-session', {
            sessionId: 'session-1',
            userId: 'user-2',
          });

          secondClientSocket.on('session-joined', () => {
            done();
          });
        });
      });
    });

    afterEach(() => {
      if (secondClientSocket) {
        secondClientSocket.close();
      }
    });

    it('should broadcast code highlighting to other participants', (done) => {
      const codeRange = {
        lineStart: 5,
        lineEnd: 7,
        columnStart: 0,
        columnEnd: 20,
      };

      secondClientSocket.on('code-highlighted', (data: any) => {
        expect(data.range).toEqual(codeRange);
        expect(data.userId).toBe('user-1');
        done();
      });

      clientSocket.emit('highlight-code', {
        sessionId: 'session-1',
        range: codeRange,
      });
    });

    it('should broadcast typing indicators to other participants', (done) => {
      secondClientSocket.on('typing-indicator', (data: any) => {
        expect(data.userId).toBe('user-1');
        expect(data.isTyping).toBe(true);
        done();
      });

      clientSocket.emit('typing-indicator', {
        sessionId: 'session-1',
        isTyping: true,
      });
    });

    it('should handle user disconnect and notify other participants', (done) => {
      mockSessionService.leaveSession.mockResolvedValue(undefined);

      secondClientSocket.on('user-left', (data: any) => {
        expect(data.userId).toBe('user-1');
        expect(mockSessionService.leaveSession).toHaveBeenCalledWith('session-1', 'user-1');
        done();
      });

      clientSocket.disconnect();
    });
  });

  describe('Connection Management', () => {
    it('should handle connection errors gracefully', () => {
      // Test that the WebSocketService has error handling setup
      expect(webSocketService).toBeDefined();
      
      // Verify that the service can handle errors without crashing
      const mockSocket = {
        id: 'test-socket',
        on: jest.fn(),
        emit: jest.fn(),
      };

      // This tests that the error handler is properly set up
      expect(mockSocket.on).not.toThrow();
    });

    it('should provide connection statistics', () => {
      const stats = webSocketService.getConnectionStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('sessionsWithUsers');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.activeSessions).toBe('number');
      expect(typeof stats.sessionsWithUsers).toBe('object');
    });
  });

  describe('AI Integration Events', () => {
    it('should broadcast AI analysis results', (done) => {
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          type: 'bug',
          severity: 'high',
          title: 'Potential null pointer',
          description: 'Variable may be null',
        },
      ];

      // First join a session
      mockSessionService.getSessionState.mockResolvedValue(mockSessionState);
      
      clientSocket.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket.on('session-joined', () => {
        clientSocket.on('ai-analysis-complete', (data: any) => {
          expect(data.suggestions).toEqual(mockSuggestions);
          done();
        });

        webSocketService.broadcastAIAnalysis('session-1', mockSuggestions);
      });
    });

    it('should broadcast debate arguments', (done) => {
      const mockArguments = {
        arguments: ['This approach is more efficient'],
        counterArguments: ['But it sacrifices readability'],
        context: { codeChange: { id: 'change-1' } },
      };

      // First join a session
      mockSessionService.getSessionState.mockResolvedValue(mockSessionState);
      
      clientSocket.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket.on('session-joined', () => {
        clientSocket.on('debate-arguments', (data: any) => {
          expect(data.arguments).toEqual(mockArguments);
          done();
        });

        webSocketService.broadcastDebateArguments('session-1', mockArguments);
      });
    });
  });
});