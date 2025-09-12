import { Request, Response } from 'express';
import { DebateService, CreateDebateSessionData, DebateArgumentInput } from '../services/DebateService';

export class DebateController {
  private debateService: DebateService;

  constructor() {
    this.debateService = new DebateService();
  }

  async createDebateSession(req: Request, res: Response): Promise<void> {
    try {
      console.log('Creating debate session with data:', req.body);
      
      const body = req.body || {};
      const data: CreateDebateSessionData = {
        codeSnippetId: body.codeSnippetId,
        sessionId: body.sessionId,
        topic: body.topic,
        codeContext: body.codeContext,
        userIntent: body.userIntent,
        previousSuggestions: body.previousSuggestions || [],
        participants: body.participants || [req.user?.userId].filter(Boolean)
      };

      console.log('Processed debate data:', data);
      const debateSession = await this.debateService.createDebateSession(data);
      console.log('Debate session created successfully:', debateSession.id);
      res.status(201).json(debateSession);
    } catch (error) {
      console.error('Error creating debate session:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: 'Failed to create debate session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDebateSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const debateSession = await this.debateService.getDebateSession(id);

      if (!debateSession) {
        res.status(404).json({ error: 'Debate session not found' });
        return;
      }

      res.json(debateSession);
    } catch (error) {
      console.error('Error getting debate session:', error);
      res.status(500).json({ error: 'Failed to get debate session' });
    }
  }

  async getActiveDebateSessions(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const debateSessions = await this.debateService.getActiveDebateSessions(sessionId);
      res.json(debateSessions);
    } catch (error) {
      console.error('Error getting active debate sessions:', error);
      res.status(500).json({ error: 'Failed to get debate sessions' });
    }
  }

  async generateInitialArguments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { topic, codeContext } = req.body;

      const debateArguments = await this.debateService.generateInitialArguments(id, topic, codeContext);
      res.json({ arguments: debateArguments });
    } catch (error) {
      console.error('Error generating initial arguments:', error);
      res.status(500).json({ error: 'Failed to generate initial arguments' });
    }
  }

  async addUserArgument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const argumentData: DebateArgumentInput = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const argument = await this.debateService.addUserArgument(id, userId, argumentData);
      res.status(201).json(argument);
    } catch (error) {
      console.error('Error adding user argument:', error);
      res.status(500).json({ error: 'Failed to add user argument' });
    }
  }

  async generateCounterArgument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { targetArgumentId } = req.body;

      const counterArgument = await this.debateService.generateCounterArgument(id, targetArgumentId);

      if (!counterArgument) {
        res.status(500).json({ error: 'Failed to generate counter argument' });
        return;
      }

      res.json(counterArgument);
    } catch (error) {
      console.error('Error generating counter argument:', error);
      res.status(500).json({ error: 'Failed to generate counter argument' });
    }
  }

  async concludeDebate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { summary, recommendation, confidence } = req.body;

      const debateSession = await this.debateService.concludeDebate(id, {
        summary,
        recommendation,
        confidence
      });

      if (!debateSession) {
        res.status(404).json({ error: 'Debate session not found' });
        return;
      }

      res.json(debateSession);
    } catch (error) {
      console.error('Error concluding debate:', error);
      res.status(500).json({ error: 'Failed to conclude debate' });
    }
  }

  async abandonDebate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const debateSession = await this.debateService.abandonDebate(id);

      if (!debateSession) {
        res.status(404).json({ error: 'Debate session not found' });
        return;
      }

      res.json(debateSession);
    } catch (error) {
      console.error('Error abandoning debate:', error);
      res.status(500).json({ error: 'Failed to abandon debate' });
    }
  }

  async getDebateAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const analytics = await this.debateService.getDebateAnalytics(sessionId);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting debate analytics:', error);
      res.status(500).json({ error: 'Failed to get debate analytics' });
    }
  }
}
