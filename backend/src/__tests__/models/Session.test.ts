import { Session } from '../../models/Session';

describe('Session Model', () => {
  let session: Session;
  const creatorId = 'user-123';
  const codeSnippetId = 'snippet-456';

  beforeEach(() => {
    session = new Session(creatorId, codeSnippetId);
  });

  describe('constructor', () => {
    it('should create a session with correct initial values', () => {
      expect(session.id).toBeDefined();
      expect(session.creatorId).toBe(creatorId);
      expect(session.codeSnippetId).toBe(codeSnippetId);
      expect(session.status).toBe('active');
      expect(session.maxParticipants).toBe(10);
      expect(session.participants).toHaveLength(1);
      expect(session.participants[0].userId).toBe(creatorId);
      expect(session.participants[0].isActive).toBe(true);
    });

    it('should create a session with custom max participants', () => {
      const customSession = new Session(creatorId, codeSnippetId, 5);
      expect(customSession.maxParticipants).toBe(5);
    });
  });

  describe('addParticipant', () => {
    it('should add a new participant successfully', () => {
      const newUserId = 'user-789';
      const result = session.addParticipant(newUserId);

      expect(result).toBe(true);
      expect(session.participants).toHaveLength(2);
      expect(session.participants[1].userId).toBe(newUserId);
      expect(session.participants[1].isActive).toBe(true);
    });

    it('should reactivate existing inactive participant', () => {
      const newUserId = 'user-789';
      session.addParticipant(newUserId);
      session.removeParticipant(newUserId);
      
      expect(session.participants[1].isActive).toBe(false);
      
      const result = session.addParticipant(newUserId);
      expect(result).toBe(true);
      expect(session.participants[1].isActive).toBe(true);
    });

    it('should reject participant when session is full', () => {
      const smallSession = new Session(creatorId, codeSnippetId, 2);
      const result = smallSession.addParticipant('user-789');
      const result2 = smallSession.addParticipant('user-101');

      expect(result).toBe(true);
      expect(result2).toBe(false);
      expect(smallSession.participants).toHaveLength(2);
    });

    it('should update last activity when adding participant', () => {
      const originalActivity = session.lastActivity;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        session.addParticipant('user-789');
        expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      }, 10);
    });
  });

  describe('removeParticipant', () => {
    it('should deactivate existing participant', () => {
      const newUserId = 'user-789';
      session.addParticipant(newUserId);
      
      session.removeParticipant(newUserId);
      
      const participant = session.participants.find(p => p.userId === newUserId);
      expect(participant?.isActive).toBe(false);
    });

    it('should do nothing for non-existent participant', () => {
      const originalLength = session.participants.length;
      session.removeParticipant('non-existent');
      
      expect(session.participants).toHaveLength(originalLength);
    });
  });

  describe('getActiveParticipants', () => {
    it('should return only active participants', () => {
      session.addParticipant('user-789');
      session.addParticipant('user-101');
      session.removeParticipant('user-789');

      const activeParticipants = session.getActiveParticipants();
      
      expect(activeParticipants).toHaveLength(2);
      expect(activeParticipants.every(p => p.isActive)).toBe(true);
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivity and updatedAt timestamps', () => {
      const originalActivity = session.lastActivity;
      const originalUpdated = session.updatedAt;
      
      setTimeout(() => {
        session.updateActivity();
        
        expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
        expect(session.updatedAt.getTime()).toBeGreaterThan(originalUpdated.getTime());
      }, 10);
    });
  });

  describe('isExpired', () => {
    it('should return false for recent activity', () => {
      expect(session.isExpired(60)).toBe(false);
    });

    it('should return true for old activity', () => {
      // Manually set old timestamp
      session.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      expect(session.isExpired(60)).toBe(true);
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      session.addParticipant('user-789');
      session.status = 'paused';
      
      const json = session.toJSON();
      const restored = Session.fromJSON(json);
      
      expect(restored.id).toBe(session.id);
      expect(restored.creatorId).toBe(session.creatorId);
      expect(restored.codeSnippetId).toBe(session.codeSnippetId);
      expect(restored.status).toBe(session.status);
      expect(restored.participants).toHaveLength(session.participants.length);
      expect(restored.maxParticipants).toBe(session.maxParticipants);
    });
  });
});