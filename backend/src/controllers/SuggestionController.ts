import { Request, Response } from 'express';
import { SuggestionService, CreateSuggestionData, SuggestionFilters, SuggestionSortOptions } from '../services/SuggestionService';

export class SuggestionController {
  private suggestionService: SuggestionService;

  constructor() {
    this.suggestionService = new SuggestionService();
  }

  async createSuggestion(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateSuggestionData = {
        ...req.body,
        userId: req.user?.userId
      };

      const suggestion = await this.suggestionService.createSuggestion(data);
      res.status(201).json(suggestion);
    } catch (error) {
      console.error('Error creating suggestion:', error);
      res.status(500).json({ error: 'Failed to create suggestion' });
    }
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const filters: SuggestionFilters = {
        codeSnippetId: req.query.codeSnippetId as string,
        sessionId: req.query.sessionId as string,
        userId: req.query.userId as string,
        type: req.query.type ? (req.query.type as string).split(',') : undefined,
        category: req.query.category ? (req.query.category as string).split(',') : undefined,
        severity: req.query.severity ? (req.query.severity as string).split(',') : undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        minConfidence: req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined,
        maxConfidence: req.query.maxConfidence ? parseFloat(req.query.maxConfidence as string) : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const sortField = req.query.sortField as string;
      const validSortFields: Array<'createdAt' | 'confidence' | 'severity' | 'title'> = ['createdAt', 'confidence', 'severity', 'title'];
      
      const sort: SuggestionSortOptions = {
        field: validSortFields.includes(sortField as any) ? (sortField as 'createdAt' | 'confidence' | 'severity' | 'title') : 'createdAt',
        order: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.suggestionService.getSuggestions(filters, sort, limit, offset);
      res.json(result);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  }

  async getSuggestionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const suggestion = await this.suggestionService.getSuggestionById(id);

      if (!suggestion) {
        res.status(404).json({ error: 'Suggestion not found' });
        return;
      }

      res.json(suggestion);
    } catch (error) {
      console.error('Error getting suggestion:', error);
      res.status(500).json({ error: 'Failed to get suggestion' });
    }
  }

  async updateSuggestionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const suggestion = await this.suggestionService.updateSuggestionStatus(id, status, userId);

      if (!suggestion) {
        res.status(404).json({ error: 'Suggestion not found or unauthorized' });
        return;
      }

      // Track the interaction
      await this.suggestionService.trackInteraction(
        id,
        userId,
        suggestion.sessionId,
        status as 'accept' | 'reject' | 'implement' | 'dismiss'
      );

      res.json(suggestion);
    } catch (error) {
      console.error('Error updating suggestion status:', error);
      res.status(500).json({ error: 'Failed to update suggestion status' });
    }
  }

  async addUserFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const suggestion = await this.suggestionService.addUserFeedback(id, userId, rating, comment);

      if (!suggestion) {
        res.status(404).json({ error: 'Suggestion not found or unauthorized' });
        return;
      }

      // Track the interaction
      await this.suggestionService.trackInteraction(
        id,
        userId,
        suggestion.sessionId,
        'rate',
        { rating, comment }
      );

      res.json(suggestion);
    } catch (error) {
      console.error('Error adding user feedback:', error);
      res.status(500).json({ error: 'Failed to add user feedback' });
    }
  }

  async trackInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, details } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const suggestion = await this.suggestionService.getSuggestionById(id);
      if (!suggestion) {
        res.status(404).json({ error: 'Suggestion not found' });
        return;
      }

      const interaction = await this.suggestionService.trackInteraction(
        id,
        userId,
        suggestion.sessionId,
        action,
        details
      );

      res.json(interaction);
    } catch (error) {
      console.error('Error tracking interaction:', error);
      res.status(500).json({ error: 'Failed to track interaction' });
    }
  }

  async getSuggestionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const filters: SuggestionFilters = {
        codeSnippetId: req.query.codeSnippetId as string,
        sessionId: req.query.sessionId as string,
        userId: req.query.userId as string
      };

      const timeRange = {
        from: req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: req.query.dateTo ? new Date(req.query.dateTo as string) : new Date()
      };

      const analytics = await this.suggestionService.getSuggestionAnalytics(filters, timeRange);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting suggestion analytics:', error);
      res.status(500).json({ error: 'Failed to get suggestion analytics' });
    }
  }

  async deleteSuggestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const deleted = await this.suggestionService.deleteSuggestion(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Suggestion not found or unauthorized' });
        return;
      }

      res.json({ message: 'Suggestion deleted successfully' });
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      res.status(500).json({ error: 'Failed to delete suggestion' });
    }
  }

  async getSuggestionsByCodeSnippet(req: Request, res: Response): Promise<void> {
    try {
      const { codeSnippetId } = req.params;
      const suggestions = await this.suggestionService.getSuggestionsByCodeSnippet(codeSnippetId);
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting suggestions by code snippet:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  }

  async getSuggestionsBySession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const suggestions = await this.suggestionService.getSuggestionsBySession(sessionId);
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting suggestions by session:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  }
}
