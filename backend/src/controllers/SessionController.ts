import { Request, Response } from 'express';
import { SessionService } from '../services/SessionService';
import { AuthenticatedRequest } from '../middleware/auth';

export class SessionController {
  private sessionService: SessionService;

  constructor(sessionService: SessionService = new SessionService()) {
    this.sessionService = sessionService;
  }

  async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { codeSnippetId, maxParticipants = 10 } = req.body;
      const userId = req.user!.userId;

      if (!codeSnippetId) {
        res.status(400).json({ error: 'Code snippet ID is required' });
        return;
      }

      if (maxParticipants < 1 || maxParticipants > 50) {
        res.status(400).json({ error: 'Max participants must be between 1 and 50' });
        return;
      }

      const session = await this.sessionService.createSession(userId, codeSnippetId, maxParticipants);

      res.status(201).json({
        success: true,
        data: {
          session: session.toJSON()
        }
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create session' 
      });
    }
  }

  async joinSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.userId;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      const session = await this.sessionService.joinSession(sessionId, userId);

      res.json({
        success: true,
        data: {
          session: session.toJSON()
        }
      });
    } catch (error) {
      console.error('Error joining session:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Session not found') {
          res.status(404).json({ error: 'Session not found' });
          return;
        }
        if (error.message === 'Session is not active') {
          res.status(400).json({ error: 'Session is not active' });
          return;
        }
        if (error.message === 'Session is full') {
          res.status(400).json({ error: 'Session is full' });
          return;
        }
      }

      res.status(500).json({ error: 'Failed to join session' });
    }
  }

  async leaveSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.userId;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      await this.sessionService.leaveSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Left session successfully'
      });
    } catch (error) {
      console.error('Error leaving session:', error);
      res.status(500).json({ error: 'Failed to leave session' });
    }
  }

  async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      const session = await this.sessionService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          session: session.toJSON()
        }
      });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }

  async getUserSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const sessions = await this.sessionService.getUserSessions(userId);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => session.toJSON())
        }
      });
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({ error: 'Failed to get user sessions' });
    }
  }

  async updateSessionActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      await this.sessionService.updateSessionActivity(sessionId);

      res.json({
        success: true,
        message: 'Session activity updated'
      });
    } catch (error) {
      console.error('Error updating session activity:', error);
      res.status(500).json({ error: 'Failed to update session activity' });
    }
  }
}