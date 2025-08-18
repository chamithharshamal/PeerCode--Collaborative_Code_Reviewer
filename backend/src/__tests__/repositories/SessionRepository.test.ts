import { Pool } from 'pg';
import { SessionRepository } from '../../repositories/SessionRepository';
import { Session } from '../../models/Session';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    end: jest.fn(),
  })),
}));

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn(),
    } as any;

    repository = new SessionRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a session with participants', async () => {
      const session = new Session('user-123', 'snippet-456');
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.create(session);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([session.id, session.creatorId, session.codeSnippetId])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO session_participants'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const session = new Session('user-123', 'snippet-456');
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.create(session)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return session when found', async () => {
      const sessionId = 'session-123';
      const mockSessionData = {
        id: sessionId,
        creator_id: 'user-123',
        code_snippet_id: 'snippet-456',
        status: 'active',
        max_participants: 10,
        created_at: new Date(),
        updated_at: new Date(),
        last_activity: new Date(),
      };

      const mockParticipants = [
        {
          user_id: 'user-123',
          joined_at: new Date(),
          is_active: true,
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockSessionData] })
        .mockResolvedValueOnce({ rows: mockParticipants });

      const result = await repository.findById(sessionId);

      expect(result).toBeInstanceOf(Session);
      expect(result?.id).toBe(sessionId);
      expect(result?.creatorId).toBe('user-123');
      expect(result?.participants).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when session not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update session and participants', async () => {
      const session = new Session('user-123', 'snippet-456');
      session.addParticipant('user-789');
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.update(session);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions'),
        expect.arrayContaining([session.id, session.status])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM session_participants'),
        [session.id]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete session', async () => {
      const sessionId = 'session-123';
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.delete(sessionId);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = $1',
        [sessionId]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should return user sessions', async () => {
      const userId = 'user-123';
      const mockSessions = [
        {
          id: 'session-1',
          creator_id: userId,
          code_snippet_id: 'snippet-1',
          status: 'active',
          max_participants: 10,
          created_at: new Date(),
          updated_at: new Date(),
          last_activity: new Date(),
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockSessions });
      
      // Mock findById for each session
      jest.spyOn(repository, 'findById').mockResolvedValue(
        new Session(userId, 'snippet-1')
      );

      const result = await repository.findByUserId(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Session);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findExpiredSessions', () => {
    it('should return expired session IDs', async () => {
      const expiredSessions = [
        { id: 'session-1' },
        { id: 'session-2' },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: expiredSessions });

      const result = await repository.findExpiredSessions(60);

      expect(result).toEqual(['session-1', 'session-2']);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE last_activity < $1'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateLastActivity', () => {
    it('should update session last activity', async () => {
      const sessionId = 'session-123';
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.updateLastActivity(sessionId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET last_activity = NOW()'),
        [sessionId]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});