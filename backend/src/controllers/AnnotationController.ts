import { Request, Response } from 'express';
import { AnnotationService, CreateAnnotationRequest, UpdateAnnotationRequest } from '../services/AnnotationService';

export class AnnotationController {
  private annotationService: AnnotationService;

  constructor() {
    this.annotationService = new AnnotationService();
  }

  // POST /api/annotations
  createAnnotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        sessionId,
        lineStart,
        lineEnd,
        columnStart,
        columnEnd,
        content,
        type = 'comment'
      } = req.body;

      // Validate required fields
      if (!sessionId || lineStart === undefined || lineEnd === undefined ||
          columnStart === undefined || columnEnd === undefined || !content) {
        res.status(400).json({ 
          error: 'Missing required fields: sessionId, lineStart, lineEnd, columnStart, columnEnd, content' 
        });
        return;
      }

      const request: CreateAnnotationRequest = {
        userId,
        sessionId,
        lineStart: parseInt(lineStart),
        lineEnd: parseInt(lineEnd),
        columnStart: parseInt(columnStart),
        columnEnd: parseInt(columnEnd),
        content: content.trim(),
        type
      };

      const annotation = await this.annotationService.createAnnotation(request);
      
      res.status(201).json({
        success: true,
        data: annotation
      });
    } catch (error) {
      console.error('Error creating annotation:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to create annotation' 
      });
    }
  };

  // GET /api/annotations/:id
  getAnnotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const annotation = await this.annotationService.getAnnotation(id);
      
      if (!annotation) {
        res.status(404).json({ error: 'Annotation not found' });
        return;
      }

      res.json({
        success: true,
        data: annotation
      });
    } catch (error) {
      console.error('Error getting annotation:', error);
      res.status(500).json({ error: 'Failed to get annotation' });
    }
  };

  // GET /api/sessions/:sessionId/annotations
  getSessionAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const annotations = await this.annotationService.getSessionAnnotations(sessionId);
      
      res.json({
        success: true,
        data: annotations
      });
    } catch (error) {
      console.error('Error getting session annotations:', error);
      res.status(500).json({ error: 'Failed to get session annotations' });
    }
  };

  // GET /api/users/:userId/annotations
  getUserAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.userId;

      // Users can only access their own annotations
      if (userId !== requestingUserId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      
      const annotations = await this.annotationService.getUserAnnotations(userId);
      
      res.json({
        success: true,
        data: annotations
      });
    } catch (error) {
      console.error('Error getting user annotations:', error);
      res.status(500).json({ error: 'Failed to get user annotations' });
    }
  };

  // PUT /api/annotations/:id
  updateAnnotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if annotation exists and user owns it
      const existingAnnotation = await this.annotationService.getAnnotation(id);
      if (!existingAnnotation) {
        res.status(404).json({ error: 'Annotation not found' });
        return;
      }

      if (existingAnnotation.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const updates: UpdateAnnotationRequest = {};
      
      if (req.body.content !== undefined) {
        updates.content = req.body.content.trim();
      }
      
      if (req.body.type !== undefined) {
        updates.type = req.body.type;
      }

      if (req.body.lineStart !== undefined) {
        updates.lineStart = parseInt(req.body.lineStart);
      }

      if (req.body.lineEnd !== undefined) {
        updates.lineEnd = parseInt(req.body.lineEnd);
      }

      if (req.body.columnStart !== undefined) {
        updates.columnStart = parseInt(req.body.columnStart);
      }

      if (req.body.columnEnd !== undefined) {
        updates.columnEnd = parseInt(req.body.columnEnd);
      }

      const updatedAnnotation = await this.annotationService.updateAnnotation(id, updates);
      
      res.json({
        success: true,
        data: updatedAnnotation
      });
    } catch (error) {
      console.error('Error updating annotation:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to update annotation' 
      });
    }
  };

  // DELETE /api/annotations/:id
  deleteAnnotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if annotation exists and user owns it
      const existingAnnotation = await this.annotationService.getAnnotation(id);
      if (!existingAnnotation) {
        res.status(404).json({ error: 'Annotation not found' });
        return;
      }

      if (existingAnnotation.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const deleted = await this.annotationService.deleteAnnotation(id);
      
      if (!deleted) {
        res.status(404).json({ error: 'Annotation not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Annotation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting annotation:', error);
      res.status(500).json({ error: 'Failed to delete annotation' });
    }
  };

  // GET /api/sessions/:sessionId/annotations/line-range
  getAnnotationsByLineRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { lineStart, lineEnd } = req.query;

      if (!lineStart || !lineEnd) {
        res.status(400).json({ 
          error: 'Missing required query parameters: lineStart, lineEnd' 
        });
        return;
      }

      const annotations = await this.annotationService.getAnnotationsByLineRange(
        sessionId,
        parseInt(lineStart as string),
        parseInt(lineEnd as string)
      );
      
      res.json({
        success: true,
        data: annotations
      });
    } catch (error) {
      console.error('Error getting annotations by line range:', error);
      res.status(500).json({ error: 'Failed to get annotations by line range' });
    }
  };

  // DELETE /api/sessions/:sessionId/annotations
  clearSessionAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Only session creator or admin can clear all annotations
      // This would require session validation - for now, allow any authenticated user
      
      const deletedCount = await this.annotationService.clearSessionAnnotations(sessionId);
      
      res.json({
        success: true,
        message: `Deleted ${deletedCount} annotations`,
        deletedCount
      });
    } catch (error) {
      console.error('Error clearing session annotations:', error);
      res.status(500).json({ error: 'Failed to clear session annotations' });
    }
  };
}