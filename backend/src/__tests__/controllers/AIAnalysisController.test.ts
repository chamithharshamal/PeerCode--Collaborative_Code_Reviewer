import request from 'supertest';
import express from 'express';
import { AIAnalysisController } from '../../controllers/AIAnalysisController';
import { AIAnalysisService } from '../../services/AIAnalysisService';
import { CodeSnippetService } from '../../services/CodeSnippetService';
import { SessionService } from '../../services/SessionService';
import { authenticateToken } from '../../middleware/auth';

// Mock the services
jest.mock('../../services/AIAnalysisService');
jest.mock('../../services/CodeSnippetService');
jest.mock('../../services/SessionService');
jest.mock('../../middleware/auth');

const MockedAIAnalysisService = AIAnalysisService as jest.MockedClass<typeof AIAnalysisService>;
const MockedCodeSnippetService = CodeSnippetService as jest.MockedClass<typeof CodeSnippetService>;
const MockedSessionService = SessionService as jest.MockedClass<typeof SessionService>;

describe('AIAnalysisController', () => {
  let app: express.Application;
  let mockAIAnalysisService: jest.Mocked<AIAnalysisService>;
  let mockCodeSnippetService: jest.Mocked<CodeSnippetService>;
  let mockSessionService: jest.Mocked<SessionService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup express app
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { userId: 'user-1', username: 'testuser', email: 'test@example.com' };
      next();
    });

    // Setup service mocks
    mockAIAnalysisService = {
      analyzeCode: jest.fn(),
      generateSuggestions: jest.fn(),
      simulateDebate: jest.fn(),
      continueDebate: jest.fn()
    } as any;

    mockCodeSnippetService = {
      getCodeSnippet: jest.fn()
    } as any;

    mockSessionService = {
      getById: jest.fn(),
      updateAISuggestions: jest.fn()
    } as any;

    MockedAIAnalysisService.mockImplementation(() => mockAIAnalysisService);
    MockedCodeSnippetService.mockImplementation(() => mockCodeSnippetService);
    MockedSessionService.mockImplementation(() => mockSessionService);

    // Setup routes
    const controller = new AIAnalysisController();
    app.post('/analyze', controller.analyzeCode);
    app.post('/sessions/:sessionId/analyze', controller.analyzeSessionCode);
    app.post('/sessions/:sessionId/debate/start', controller.startDebate);
    app.post('/sessions/:sessionId/debate/continue', controller.continueDebate);
    app.get('/health', controller.getHealthStatus);
  });

  describe('POST /analyze', () => {
    it('should analyze code snippet successfully', async () => {
      const mockCodeSnippet = {
        id: 'snippet-1',
        content: 'function test() { return true; }',
        language: 'javascript',
        filename: 'test.js',
        size: 100,
        uploadedAt: new Date()
      };

      const mockAnalysis = {
        codeSnippetId: 'snippet-1',
        language: 'javascript',
        issues: [],
        metrics: { complexity: 80, maintainability: 85, readability: 90 },
        suggestions: []
      };

      const mockSuggestions = [
        {
          id: 'suggestion-1',
          sessionId: '',
          type: 'optimization' as const,
          severity: 'low' as const,
          lineStart: 1,
          lineEnd: 1,
          title: 'Test Suggestion',
          description: 'Test description',
          confidence: 0.8,
          createdAt: new Date()
        }
      ];

      mockCodeSnippetService.getCodeSnippet.mockResolvedValue(mockCodeSnippet);
      mockAIAnalysisService.analyzeCode.mockResolvedValue(mockAnalysis);
      mockAIAnalysisService.generateSuggestions.mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .post('/analyze')
        .send({ codeSnippetId: 'snippet-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toEqual(mockSuggestions);
      expect(response.body.data.analysisId).toBeDefined();
    });

    it('should return 400 when codeSnippetId is missing', async () => {
      const response = await request(app)
        .post('/analyze')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_CODE_SNIPPET_ID');
    });

    it('should return 404 when code snippet is not found', async () => {
      mockCodeSnippetService.getCodeSnippet.mockResolvedValue(null);

      const response = await request(app)
        .post('/analyze')
        .send({ codeSnippetId: 'nonexistent' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CODE_SNIPPET_NOT_FOUND');
    });

    it('should handle analysis errors gracefully', async () => {
      const mockCodeSnippet = {
        id: 'snippet-1',
        content: 'function test() { return true; }',
        language: 'javascript',
        filename: 'test.js',
        size: 100,
        uploadedAt: new Date()
      };

      mockCodeSnippetService.getCodeSnippet.mockResolvedValue(mockCodeSnippet);
      mockAIAnalysisService.analyzeCode.mockRejectedValue(new Error('AI service error'));

      const response = await request(app)
        .post('/analyze')
        .send({ codeSnippetId: 'snippet-1' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ANALYSIS_FAILED');
    });
  });

  describe('POST /sessions/:sessionId/analyze', () => {
    it('should analyze session code successfully', async () => {
      const mockSession = {
        id: 'session-1',
        creatorId: 'user-1',
        codeSnippetId: 'snippet-1',
        participants: [{ userId: 'user-1', joinedAt: new Date(), isActive: true }],
        codeSnippet: {
          id: 'snippet-1',
          content: 'function test() { return true; }',
          language: 'javascript',
          filename: 'test.js',
          size: 100,
          uploadedAt: new Date()
        },
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        maxParticipants: 10,
        addParticipant: jest.fn(),
        removeParticipant: jest.fn(),
        getActiveParticipants: jest.fn().mockReturnValue([{ userId: 'user-1', joinedAt: new Date(), isActive: true }]),
        updateActivity: jest.fn(),
        toJSON: jest.fn(),
        isExpired: jest.fn().mockReturnValue(false)
      };

      const mockAnalysis = {
        codeSnippetId: 'snippet-1',
        language: 'javascript',
        issues: [],
        metrics: { complexity: 80, maintainability: 85, readability: 90 },
        suggestions: []
      };

      const mockSuggestions = [
        {
          id: 'suggestion-1',
          sessionId: 'session-1',
          type: 'optimization' as const,
          severity: 'low' as const,
          lineStart: 1,
          lineEnd: 1,
          title: 'Test Suggestion',
          description: 'Test description',
          confidence: 0.8,
          createdAt: new Date()
        }
      ];

      mockSessionService.getById.mockResolvedValue(mockSession);
      mockAIAnalysisService.analyzeCode.mockResolvedValue(mockAnalysis);
      mockAIAnalysisService.generateSuggestions.mockResolvedValue(mockSuggestions);
      mockSessionService.updateAISuggestions.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/sessions/session-1/analyze');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions[0].sessionId).toBe('session-1');
      expect(mockSessionService.updateAISuggestions).toHaveBeenCalledWith('session-1', expect.any(Array));
    });

    it('should return 404 when session is not found', async () => {
      mockSessionService.getById.mockResolvedValue(null);

      const response = await request(app)
        .post('/sessions/nonexistent/analyze');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('should return 403 when user does not have access to session', async () => {
      const mockSession = {
        id: 'session-1',
        creatorId: 'other-user',
        codeSnippetId: 'snippet-1',
        participants: [{ userId: 'other-user', joinedAt: new Date(), isActive: true }],
        codeSnippet: {
          id: 'snippet-1',
          content: 'function test() { return true; }',
          language: 'javascript'
        },
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        maxParticipants: 10,
        addParticipant: jest.fn(),
        removeParticipant: jest.fn(),
        getActiveParticipants: jest.fn(),
        updateActivity: jest.fn(),
        toJSON: jest.fn(),
        isExpired: jest.fn().mockReturnValue(false)
      };

      mockSessionService.getById.mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/sessions/session-1/analyze');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('POST /sessions/:sessionId/debate/start', () => {
    it('should start debate successfully', async () => {
      const mockSession = {
        id: 'session-1',
        creatorId: 'user-1',
        codeSnippetId: 'snippet-1',
        participants: [{ userId: 'user-1', joinedAt: new Date(), isActive: true }],
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        maxParticipants: 10,
        addParticipant: jest.fn(),
        removeParticipant: jest.fn(),
        getActiveParticipants: jest.fn(),
        updateActivity: jest.fn(),
        toJSON: jest.fn(),
        isExpired: jest.fn().mockReturnValue(false)
      };

      const mockCodeChange = {
        id: 'change-1',
        lineStart: 1,
        lineEnd: 3,
        originalCode: 'function old() {}',
        proposedCode: 'const new = () => {}',
        reason: 'Modernize'
      };

      const mockDebateArguments = {
        arguments: ['Argument 1', 'Argument 2'],
        counterArguments: ['Counter 1', 'Counter 2'],
        context: { codeChange: mockCodeChange, previousArguments: [], userResponses: [] }
      };

      mockSessionService.getById.mockResolvedValue(mockSession);
      mockAIAnalysisService.simulateDebate.mockResolvedValue(mockDebateArguments);

      const response = await request(app)
        .post('/sessions/session-1/debate/start')
        .send({ codeChange: mockCodeChange });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDebateArguments);
    });

    it('should return 400 when codeChange is missing', async () => {
      const response = await request(app)
        .post('/sessions/session-1/debate/start')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_CODE_CHANGE');
    });
  });

  describe('POST /sessions/:sessionId/debate/continue', () => {
    it('should continue debate successfully', async () => {
      const mockSession = {
        id: 'session-1',
        creatorId: 'user-1',
        codeSnippetId: 'snippet-1',
        participants: [{ userId: 'user-1', joinedAt: new Date(), isActive: true }],
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        maxParticipants: 10,
        addParticipant: jest.fn(),
        removeParticipant: jest.fn(),
        getActiveParticipants: jest.fn(),
        updateActivity: jest.fn(),
        toJSON: jest.fn(),
        isExpired: jest.fn().mockReturnValue(false)
      };

      const mockContext = {
        codeChange: {
          id: 'change-1',
          lineStart: 1,
          lineEnd: 3,
          originalCode: 'function old() {}',
          proposedCode: 'const new = () => {}',
          reason: 'Modernize'
        },
        previousArguments: [],
        userResponses: []
      };

      const mockDebateResponse = {
        response: 'AI response to user input',
        followUpQuestions: ['Question 1?', 'Question 2?'],
        context: mockContext
      };

      mockSessionService.getById.mockResolvedValue(mockSession);
      mockAIAnalysisService.continueDebate.mockResolvedValue(mockDebateResponse);

      const response = await request(app)
        .post('/sessions/session-1/debate/continue')
        .send({ context: mockContext, userInput: 'User response' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDebateResponse);
    });

    it('should return 400 when context or userInput is missing', async () => {
      const response = await request(app)
        .post('/sessions/session-1/debate/continue')
        .send({ context: {} });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_DEBATE_DATA');
    });
  });

  describe('GET /health', () => {
    it('should return health status successfully', async () => {
      // Mock environment variable
      process.env.HUGGINGFACE_API_KEY = 'test-key';

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.aiServiceAvailable).toBe(true);
      expect(response.body.data.models).toBeDefined();
      expect(response.body.data.features).toBeDefined();

      // Clean up
      delete process.env.HUGGINGFACE_API_KEY;
    });

    it('should indicate fallback mode when API key is not configured', async () => {
      // Ensure no API key is set
      delete process.env.HUGGINGFACE_API_KEY;

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.aiServiceAvailable).toBe(false);
      expect(response.body.data.features.fallbackMode).toBe(true);
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      // Mock authentication failure
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' }
        });
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post('/analyze')
        .send({ codeSnippetId: 'snippet-1' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});