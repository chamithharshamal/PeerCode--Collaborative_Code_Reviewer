import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { WebSocketService } from '../../services/WebSocketService';
import { SessionService } from '../../services/SessionService';
import { UserService } from '../../services/UserService';
import { AnnotationService } from '../../services/AnnotationService';
import { User, CodeSnippet, SessionState } from '../../types';

describe('WebSocket Integration Tests', () => {
  let httpServer: any;
  let io: Server;
  let webSocketService: WebSocketService;
  let mockSessionService: jest.Mocked<SessionService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockAnnotationService: jest.Mocked<AnnotationService>;
  let clientSocket1: any;
  let clientSocket2: any;

  const mockUser1: User = {
    id: 'user-1',
    username: 'testuser1',
    email: 'test1@example.com',
    createdAt: new Date(),
    lastActive: new Date(),
  };

  const mockUser2: User = {
    id: 'user-2',
    username: 'testuser2',
    email: 'test2@example.com',
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
    activeParticipants: [mockUser1],
    currentAnnotations: [],
    aiSuggestions: [],
    debateMode: false,
  };

  beforeEach((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    
    // Create mock services
    mockSessionService = {
      getSessionState: jest.fn().mockResolvedValue(mockSessionState),
      joinSession: jest.fn().mockResolvedValue(undefined),
      leaveSession: jest.fn().mockResolvedValue(undefined),
      addAnnotation: jest.fn(),
      createSession: jest.fn(),
      updateSessionState: jest.fn(),
    } as any;

    mockUserService = {
      getUserById: jest.fn().mockImplementation((userId: string) => {
        if (userId === 'user-1') return Promise.resolve(mockUser1);
        if (userId === 'user-2') return Promise.resolve(mockUser2);
        return Promise.resolve(null);
      }),
      createUser: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
    } as any;

    mockAnnotationService = {
      addAnnotation: jest.fn().mockImplementation((sessionId: string, annotation: any) => {
        return Promise.resolve({
          ...annotation,
          id: 'annotation-' + Date.now(),
          createdAt: new Date(),
        });
      }),
      getSessionAnnotations: jest.fn().mockResolvedValue([]),
      removeAnnotation: jest.fn(),
      updateAnnotation: jest.fn(),
      clearSessionAnnotations: jest.fn(),
      getAnnotationsByUser: jest.fn(),
      getAnnotationsByLine: jest.fn(),
    } as any;

    // Initialize WebSocket service
    webSocketService = new WebSocketService(io, mockSessionService, mockUserService, mockAnnotationService);

    httpServer.listen(() => {
      const port = httpServer.address()?.port;
      
      // Create two client connections
      clientSocket1 = Client(`http://localhost:${port}`);
      clientSocket2 = Client(`http://localhost:${port}`);
      
      let connectionsReady = 0;
      const checkReady = () => {
        connectionsReady++;
        if (connectionsReady === 2) {
          done();
        }
      };
      
      clientSocket1.on('connect', checkReady);
      clientSocket2.on('connect', checkReady);
    });
  });

  afterEach(() => {
    io.close();
    clientSocket1.close();
    clientSocket2.close();
    httpServer.close();
  });

  describe('Multi-user Collaboration', () => {
    it('should handle multiple users joining the same session', (done) => {
      let user1Joined = false;
      let user2Joined = false;

      // User 1 joins session
      clientSocket1.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket1.on('session-joined', () => {
        user1Joined = true;
        
        // User 2 joins the same session
        clientSocket2.emit('join-session', {
          sessionId: 'session-1',
          userId: 'user-2',
        });
      });

      // User 1 should be notified when User 2 joins
      clientSocket1.on('user-joined', (data: any) => {
        expect(data.user.id).toBe('user-2');
        expect(user1Joined).toBe(true);
        expect(user2Joined).toBe(true);
        done();
      });

      clientSocket2.on('session-joined', () => {
        user2Joined = true;
      });
    });

    it('should broadcast annotations between users in real-time', (done) => {
      // First, both users join the session
      clientSocket1.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket1.on('session-joined', () => {
        clientSocket2.emit('join-session', {
          sessionId: 'session-1',
          userId: 'user-2',
        });
      });

      clientSocket2.on('session-joined', () => {
        // User 2 should receive the annotation from User 1
        clientSocket2.on('annotation-added', (data: any) => {
          expect(data.annotation.content).toBe('This is a test annotation');
          expect(data.userId).toBe('user-1');
          expect(mockAnnotationService.createAnnotation).toHaveBeenCalled();
          done();
        });

        // User 1 adds an annotation
        clientSocket1.emit('add-annotation', {
          sessionId: 'session-1',
          annotation: {
            lineStart: 1,
            lineEnd: 1,
            columnStart: 0,
            columnEnd: 10,
            content: 'This is a test annotation',
            type: 'comment',
          },
        });
      });
    });

    it('should broadcast code highlighting between users', (done) => {
      // First, both users join the session
      clientSocket1.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket1.on('session-joined', () => {
        clientSocket2.emit('join-session', {
          sessionId: 'session-1',
          userId: 'user-2',
        });
      });

      clientSocket2.on('session-joined', () => {
        // User 2 should receive the highlight from User 1
        clientSocket2.on('code-highlighted', (data: any) => {
          expect(data.range.lineStart).toBe(5);
          expect(data.range.lineEnd).toBe(7);
          expect(data.userId).toBe('user-1');
          done();
        });

        // User 1 highlights code
        clientSocket1.emit('highlight-code', {
          sessionId: 'session-1',
          range: {
            lineStart: 5,
            lineEnd: 7,
            columnStart: 0,
            columnEnd: 20,
          },
        });
      });
    });

    it('should handle typing indicators between users', (done) => {
      // First, both users join the session
      clientSocket1.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket1.on('session-joined', () => {
        clientSocket2.emit('join-session', {
          sessionId: 'session-1',
          userId: 'user-2',
        });
      });

      clientSocket2.on('session-joined', () => {
        // User 2 should receive typing indicator from User 1
        clientSocket2.on('typing-indicator', (data: any) => {
          expect(data.userId).toBe('user-1');
          expect(data.isTyping).toBe(true);
          done();
        });

        // User 1 starts typing
        clientSocket1.emit('typing-indicator', {
          sessionId: 'session-1',
          isTyping: true,
        });
      });
    });

    it('should handle user disconnection gracefully', (done) => {
      // First, both users join the session
      clientSocket1.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket1.on('session-joined', () => {
        clientSocket2.emit('join-session', {
          sessionId: 'session-1',
          userId: 'user-2',
        });
      });

      clientSocket2.on('session-joined', () => {
        // User 2 should be notified when User 1 disconnects
        clientSocket2.on('user-left', (data: any) => {
          expect(data.userId).toBe('user-1');
          expect(mockSessionService.leaveSession).toHaveBeenCalledWith('session-1', 'user-1');
          done();
        });

        // User 1 disconnects
        clientSocket1.disconnect();
      });
    });
  });

  describe('AI Integration Broadcasting', () => {
    it('should broadcast AI analysis results to all session participants', (done) => {
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          type: 'bug',
          severity: 'high',
          title: 'Potential null pointer',
          description: 'Variable may be null',
        },
      ];

      // User joins session first
      clientSocket1.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket1.on('session-joined', () => {
        clientSocket1.on('ai-analysis-complete', (data: any) => {
          expect(data.suggestions).toEqual(mockSuggestions);
          done();
        });

        // Simulate AI analysis broadcast
        webSocketService.broadcastAIAnalysis('session-1', mockSuggestions);
      });
    });

    it('should broadcast debate arguments to all session participants', (done) => {
      const mockArguments = {
        arguments: ['This approach is more efficient'],
        counterArguments: ['But it sacrifices readability'],
        context: { codeChange: { id: 'change-1' } },
      };

      // User joins session first
      clientSocket1.emit('join-session', {
        sessionId: 'session-1',
        userId: 'user-1',
      });

      clientSocket1.on('session-joined', () => {
        clientSocket1.on('debate-arguments', (data: any) => {
          expect(data.arguments).toEqual(mockArguments);
          done();
        });

        // Simulate debate arguments broadcast
        webSocketService.broadcastDebateArguments('session-1', mockArguments);
      });
    });
  });
});