import Redis from 'ioredis';
import { SessionService } from '../../services/SessionService';
import { SessionRepository } from '../../repositories/SessionRepository';
import { Session } from '../../models/Session';

// Mock Redis
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

// Mock SessionRepository
jest.mock('../../repositories/SessionRepository');
const MockedSessionRepository = SessionRepository as jest.MockedClass<typeof SessionRepository>;

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockRedis: jest.Mocked<Redis>;
  let mockRepository: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    mockRedis = {
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      expire: jest.fn(),
    } as any;

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findByUserId: jest.fn(),
      findExpiredSessions: jest.fn(),
    } as any;

    sessionService = new SessionService(mockRedis, mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create and cache a new session', async () => {
      const userId = 'user-123';
      const codeSnippetId = 'snippet-456';
      
      mockRepository.create.mockResolvedValue(undefined);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await sessionService.createSession(userId, codeSnippetId);

      expect(result).toBeInstanceOf(Session);
      expect(result.creatorId).toBe(userId);
      expect(result.codeSnippetId).toBe(codeSnippetId);
      expect(mockRepository.create).toHaveBeenCalledWith(result);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `session:${result.id}`,
        3600,
        expect.any(String)
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith(`user_sessions:${userId}`, result.id);
    });

    it('should throw error when repository fails', async () => {
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        sessionService.createSession('user-123', 'snippet-456')
      ).rejects.toThrow('Failed to create session');
    });
  });

  describe('joinSession', () => {
    it('should join session from cache', async () => {
      const sessionId = 'session-123';
      const userId = 'user-789';
      const session = new Session('user-123', 'snippet-456');
      
      mockRedis.get.mockResolvedValue(JSON.stringify(session.toJSON()));
      mockRepository.update.mockResolvedValue(undefined);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await sessionService.joinSession(sessionId, userId);

      expect(result.participants).toHaveLength(2);
      expect(result.participants[1].userId).toBe(userId);
      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should join session from database when not in cache', async () => {
      const sessionId = 'session-123';
      const userId = 'user-789';
      const session = new Session('user-123', 'snippet-456');
      
      mockRedis.get.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(session);
      mockRepository.update.mockResolvedValue(undefined);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await sessionService.joinSession(sessionId, userId);

      expect(result.participants).toHaveLength(2);
      expect(mockRepository.findById).toHaveBeenCalledWith(sessionId);
      expect(mockRedis.setex).toHaveBeenCalledTimes(2); // Cache + update
    });

    it('should throw error when session not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        sessionService.joinSession('non-existent', 'user-123')
      ).rejects.toThrow('Session not found');
    });

    it('should throw error when session is not active', async () => {
      const session = new Session('user-123', 'snippet-456');
      session.status = 'completed';
      
      mockRedis.get.mockResolvedValue(JSON.stringify(session.toJSON()));

      await expect(
        sessionService.joinSession('session-123', 'user-789')
      ).rejects.toThrow('Session is not active');
    });

    it('should throw error when session is full', async () => {
      const session = new Session('user-123', 'snippet-456', 1); // Max 1 participant
      
      mockRedis.get.mockResolvedValue(JSON.stringify(session.toJSON()));

      await expect(
        sessionService.joinSession('session-123', 'user-789')
      ).rejects.toThrow('Session is full');
    });
  });

  describe('leaveSession', () => {
    it('should remove participant from session', async () => {
      const sessionId = 'session-123';
      const userId = 'user-789';
      const session = new Session('user-123', 'snippet-456');
      session.addParticipant(userId);
      
      mockRedis.get.mockResolvedValue(JSON.stringify(session.toJSON()));
      mockRepository.update.mockResolvedValue(undefined);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.srem.mockResolvedValue(1);

      await sessionService.leaveSession(sessionId, userId);

      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRedis.srem).toHaveBeenCalledWith(`user_sessions:${userId}`, sessionId);
    });

    it('should mark session as completed when no active participants', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123'; // Only participant
      const session = new Session(userId, 'snippet-456');
      
      mockRedis.get.mockResolvedValue(JSON.stringify(session.toJSON()));
      mockRepository.update.mockResolvedValue(undefined);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.srem.mockResolvedValue(1);

      await sessionService.leaveSession(sessionId, userId);

      // Verify session status was updated to completed
      const updateCall = mockRepository.update.mock.calls[0][0];
      expect(updateCall.status).toBe('completed');
    });
  });

  describe('getSession', () => {
    it('should return session from cache', async () => {
      const sessionId = 'session-123';
      const session = new Session('user-123', 'snippet-456');
      
      mockRedis.get.mockResolvedValue(JSON.stringify(session.toJSON()));

      const result = await sessionService.getSession(sessionId);

      expect(result).toBeInstanceOf(Session);
      expect(result?.id).toBe(session.id);
      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it('should return session from database and cache it', async () => {
      const sessionId = 'session-123';
      const session = new Session('user-123', 'snippet-456');
      
      mockRedis.get.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(session);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await sessionService.getSession(sessionId);

      expect(result).toBeInstanceOf(Session);
      expect(mockRepository.findById).toHaveBeenCalledWith(sessionId);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return null when session not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(null);

      const result = await sessionService.getSession('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      const expiredSessionIds = ['session-1', 'session-2'];
      const session1 = new Session('user-123', 'snippet-456');
      const session2 = new Session('user-789', 'snippet-101');
      
      mockRepository.findExpiredSessions.mockResolvedValue(expiredSessionIds);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(session1.toJSON()))
        .mockResolvedValueOnce(JSON.stringify(session2.toJSON()));
      mockRepository.update.mockResolvedValue(undefined);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);
      mockRedis.srem.mockResolvedValue(1);

      const result = await sessionService.cleanupExpiredSessions(60);

      expect(result).toBe(2);
      expect(mockRepository.findExpiredSessions).toHaveBeenCalledWith(60);
      expect(mockRepository.update).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      const expiredSessionIds = ['session-1'];
      
      mockRepository.findExpiredSessions.mockResolvedValue(expiredSessionIds);
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await sessionService.cleanupExpiredSessions(60);

      expect(result).toBe(0);
    });
  });
});