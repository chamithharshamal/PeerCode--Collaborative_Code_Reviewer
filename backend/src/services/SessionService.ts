import Redis from 'ioredis';
import { Session, SessionState as SessionModelState } from '../models/Session';
import { SessionRepository } from '../repositories/SessionRepository';
import { redis } from '../config/database';
import { AnnotationService, CreateAnnotationRequest, UpdateAnnotationRequest } from './AnnotationService';
import { UserService } from './UserService';
import { SessionState, Annotation, User, AISuggestion } from '../types';
import { AnnotationData } from '../models/Annotation';

export interface SessionUpdate {
  participants?: string[];
  status?: 'active' | 'paused' | 'completed';
}

export class SessionService {
  private redis: Redis;
  private sessionRepository: SessionRepository;
  private annotationService: AnnotationService;
  private userService: UserService;
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly SESSION_TIMEOUT = 3600; // 1 hour in seconds

  constructor(
    redisClient: Redis = redis, 
    sessionRepo: SessionRepository = new SessionRepository(),
    annotationService: AnnotationService = new AnnotationService(),
    userService: UserService = new UserService()
  ) {
    this.redis = redisClient;
    this.sessionRepository = sessionRepo;
    this.annotationService = annotationService;
    this.userService = userService;
  }

  async createSession(userId: string, codeSnippetId: string, maxParticipants: number = 10): Promise<Session> {
    const session = new Session(userId, codeSnippetId, maxParticipants);

    try {
      // Save to PostgreSQL for persistence
      await this.sessionRepository.create(session);

      // Cache in Redis for fast access
      await this.cacheSession(session);

      // Add to user's active sessions
      await this.addUserSession(userId, session.id);

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async joinSession(sessionId: string, userId: string): Promise<Session> {
    try {
      // Try to get from Redis cache first
      let session = await this.getSessionFromCache(sessionId);

      // If not in cache, get from database
      if (!session) {
        session = await this.sessionRepository.findById(sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
        // Cache it for future requests
        await this.cacheSession(session);
      }

      // Check if session is active
      if (session.status !== 'active') {
        throw new Error('Session is not active');
      }

      // Add participant
      const added = session.addParticipant(userId);
      if (!added) {
        throw new Error('Session is full');
      }

      // Update in both cache and database
      await this.updateSession(session);
      await this.addUserSession(userId, sessionId);

      return session;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return; // Session doesn't exist, nothing to do
      }

      session.removeParticipant(userId);
      await this.updateSession(session);
      await this.removeUserSession(userId, sessionId);

      // If no active participants left, mark session as completed
      if (session.getActiveParticipants().length === 0) {
        session.status = 'completed';
        await this.updateSession(session);
      }
    } catch (error) {
      console.error('Error leaving session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      // Try cache first
      let session = await this.getSessionFromCache(sessionId);
      
      if (!session) {
        // Get from database
        session = await this.sessionRepository.findById(sessionId);
        if (session) {
          // Cache it
          await this.cacheSession(session);
        }
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async getById(sessionId: string): Promise<Session | null> {
    return this.getSession(sessionId);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.updateActivity();
        await this.updateSession(session);
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    try {
      return await this.sessionRepository.findByUserId(userId);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  async getSessionState(sessionId: string): Promise<SessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // Get active participants with user details
      const activeParticipants: User[] = [];
      for (const participant of session.getActiveParticipants()) {
        const user = await this.userService.getUserById(participant.userId);
        if (user) {
          activeParticipants.push(user);
        }
      }

      // Get current annotations
      const currentAnnotations = await this.annotationService.getSessionAnnotations(sessionId);

      return {
        session: {
          id: session.id,
          creatorId: session.creatorId,
          codeSnippet: { id: session.codeSnippetId } as any, // Will be populated by calling service
          participants: session.participants.map(p => p.userId),
          annotations: currentAnnotations,
          aiSuggestions: [], // Will be populated by AI service
          debateHistory: [], // Will be populated by debate service
          status: session.status,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        activeParticipants,
        currentAnnotations,
        aiSuggestions: [],
        debateMode: false,
      };
    } catch (error) {
      console.error('Error getting session state:', error);
      return null;
    }
  }

  async addAnnotation(sessionId: string, annotation: CreateAnnotationRequest): Promise<AnnotationData> {
    try {
      // Update session activity
      await this.updateSessionActivity(sessionId);
      
      // Add annotation through annotation service
      return await this.annotationService.createAnnotation(annotation);
    } catch (error) {
      console.error('Error adding annotation to session:', error);
      throw error;
    }
  }

  async removeAnnotation(sessionId: string, annotationId: string): Promise<boolean> {
    try {
      return await this.annotationService.deleteAnnotation(annotationId);
    } catch (error) {
      console.error('Error removing annotation from session:', error);
      return false;
    }
  }

  async updateAnnotation(sessionId: string, annotationId: string, updates: UpdateAnnotationRequest): Promise<AnnotationData | null> {
    try {
      return await this.annotationService.updateAnnotation(annotationId, updates);
    } catch (error) {
      console.error('Error updating annotation in session:', error);
      return null;
    }
  }

  async updateAISuggestions(sessionId: string, suggestions: any[]): Promise<void> {
    try {
      // For now, we'll store AI suggestions in Redis cache
      // In a full implementation, you might want to persist these in the database
      const key = `${this.SESSION_PREFIX}${sessionId}:ai_suggestions`;
      await this.redis.setex(key, this.SESSION_TIMEOUT, JSON.stringify(suggestions));
      
      // Update session activity
      await this.updateSessionActivity(sessionId);
    } catch (error) {
      console.error('Error updating AI suggestions:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(timeoutMinutes: number = 60): Promise<number> {
    try {
      const expiredSessionIds = await this.sessionRepository.findExpiredSessions(timeoutMinutes);
      let cleanedCount = 0;

      for (const sessionId of expiredSessionIds) {
        try {
          // Update status to completed
          const session = await this.getSession(sessionId);
          if (session) {
            session.status = 'completed';
            await this.updateSession(session);
            
            // Remove from cache
            await this.removeSessionFromCache(sessionId);
            
            // Remove from all users' active sessions
            for (const participant of session.participants) {
              await this.removeUserSession(participant.userId, sessionId);
            }
            
            // Clear session annotations
            await this.annotationService.clearSessionAnnotations(sessionId);
            
            cleanedCount++;
          }
        } catch (error) {
          console.error(`Error cleaning up session ${sessionId}:`, error);
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired sessions`);
      return cleanedCount;
    } catch (error) {
      console.error('Error during session cleanup:', error);
      return 0;
    }
  }

  // Private helper methods
  private async cacheSession(session: Session): Promise<void> {
    const key = `${this.SESSION_PREFIX}${session.id}`;
    await this.redis.setex(key, this.SESSION_TIMEOUT, JSON.stringify(session.toJSON()));
  }

  private async getSessionFromCache(sessionId: string): Promise<Session | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      const sessionData: SessionModelState = JSON.parse(cached);
      return Session.fromJSON(sessionData);
    }
    
    return null;
  }

  private async removeSessionFromCache(sessionId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await this.redis.del(key);
  }

  private async updateSession(session: Session): Promise<void> {
    // Update in database
    await this.sessionRepository.update(session);
    
    // Update cache
    await this.cacheSession(session);
  }

  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, this.SESSION_TIMEOUT);
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `${this.USER_SESSIONS_PREFIX}${userId}`;
    await this.redis.srem(key, sessionId);
  }
}