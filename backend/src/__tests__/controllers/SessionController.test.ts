import { Request, Response } from 'express';
import { SessionController } from '../../controllers/SessionController';
import { SessionService } from '../../services/SessionService';
import { Session } from '../../models/Session';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock SessionService
jest.mock('../../services/SessionService');
const MockedSessionService = SessionService as jest.MockedClass<typeof SessionService>;

describe('SessionController', () => {
  let controller: SessionController;
  let mockSessionService: jest.Mocked<SessionService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockSessionService = {
      createSession: jest.fn(),
      joinSession: jest.fn(),
      leaveSession: jest.fn(),
      getSession: jest.fn(),
      getUserSessions: jest.fn(),
      updateSessionActivity: jest.fn(),
    } as any;

    controller = new SessionController(mockSessionService);

    mockRequest = {
      user: { id: 'user-123', userId: 'user-123', username: 'testuser', email: 'test@example.com' },
      body: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const session = new Session('user-123', 'snippet-456');
      mockRequest.body = { codeSnippetId: 'snippet-456', maxParticipants: 10 };
      mockSessionService.createSession.mockResolvedValue(session);

      await controller.createSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockSessionService.createSession).toHaveBeenCalledWith('user-123', 'snippet-456', 10);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { session: session.toJSON() }
      });
    });

    it('should return 400 when codeSnippetId is missing', async () => {
      mockRequest.body = {};

      await controller.createSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Code snippet ID is required'
      });
    });

    it('should return 400 when maxParticipants is invalid', async () => {
      mockRequest.body = { codeSnippetId: 'snippet-456', maxParticipants: 100 };

      await controller.createSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Max participants must be between 1 and 50'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.body = { codeSnippetId: 'snippet-456' };
      mockSessionService.createSession.mockRejectedValue(new Error('Service error'));

      await controller.createSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Service error'
      });
    });
  });

  describe('joinSession', () => {
    it('should join session successfully', async () => {
      const session = new Session('user-123', 'snippet-456');
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.joinSession.mockResolvedValue(session);

      await controller.joinSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockSessionService.joinSession).toHaveBeenCalledWith('session-123', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { session: session.toJSON() }
      });
    });

    it('should return 400 when sessionId is missing', async () => {
      mockRequest.params = {};

      await controller.joinSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session ID is required'
      });
    });

    it('should return 404 when session not found', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.joinSession.mockRejectedValue(new Error('Session not found'));

      await controller.joinSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session not found'
      });
    });

    it('should return 400 when session is not active', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.joinSession.mockRejectedValue(new Error('Session is not active'));

      await controller.joinSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session is not active'
      });
    });

    it('should return 400 when session is full', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.joinSession.mockRejectedValue(new Error('Session is full'));

      await controller.joinSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session is full'
      });
    });
  });

  describe('leaveSession', () => {
    it('should leave session successfully', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.leaveSession.mockResolvedValue(undefined);

      await controller.leaveSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockSessionService.leaveSession).toHaveBeenCalledWith('session-123', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Left session successfully'
      });
    });

    it('should return 400 when sessionId is missing', async () => {
      mockRequest.params = {};

      await controller.leaveSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session ID is required'
      });
    });
  });

  describe('getSession', () => {
    it('should get session successfully', async () => {
      const session = new Session('user-123', 'snippet-456');
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.getSession.mockResolvedValue(session);

      await controller.getSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockSessionService.getSession).toHaveBeenCalledWith('session-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { session: session.toJSON() }
      });
    });

    it('should return 404 when session not found', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.getSession.mockResolvedValue(null);

      await controller.getSession(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session not found'
      });
    });
  });

  describe('getUserSessions', () => {
    it('should get user sessions successfully', async () => {
      const sessions = [new Session('user-123', 'snippet-456')];
      mockSessionService.getUserSessions.mockResolvedValue(sessions);

      await controller.getUserSessions(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockSessionService.getUserSessions).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { sessions: sessions.map(s => s.toJSON()) }
      });
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity successfully', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      mockSessionService.updateSessionActivity.mockResolvedValue(undefined);

      await controller.updateSessionActivity(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockSessionService.updateSessionActivity).toHaveBeenCalledWith('session-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Session activity updated'
      });
    });

    it('should return 400 when sessionId is missing', async () => {
      mockRequest.params = {};

      await controller.updateSessionActivity(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session ID is required'
      });
    });
  });
});