import { Request, Response } from 'express';
import { AnnotationService, CreateAnnotationRequest, UpdateAnnotationRequest } from '../services/AnnotationService';
import { ApiResponse } from '../types/api';

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
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
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
          success: false,
          error: {
            message: 'Missing required fields: sessionId, lineStart, lineEnd, columnStart, columnEnd, content',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        } as ApiResponse);
        return;
      }

      // Validate content length
      if (content.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Annotation content cannot be empty',
            code: 'EMPTY_CONTENT'
          }
        } as ApiResponse);
        return;
      }

      if (content.length > 5000) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Annotation content exceeds maximum length of 5000 characters',
            code: 'CONTENT_TOO_LONG'
          }
        } as ApiResponse);
        return;
      }

      // Validate type
      if (!['comment', 'suggestion', 'question'].includes(type)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid annotation type. Must be comment, suggestion, or question',
            code: 'INVALID_TYPE'
          }
        } as ApiResponse);
        return;
      }

      // Validate line and column ranges
      if (lineStart < 0 || lineEnd < lineStart) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid line range',
            code: 'INVALID_LINE_RANGE'
          }
        } as ApiResponse);
        return;
      }

      if (columnStart < 0 || columnEnd < 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid column range',
            code: 'INVALID_COLUMN_RANGE'
          }
        } as ApiResponse);
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
      } as ApiResponse);
    } catch (error) {
      console.error('Error creating annotation:', error);
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create annotation',
          code: 'ANNOTATION_CREATE_FAILED'
        }
      } as ApiResponse);
    }
  };

  // GET /api/annotations/:id
  getAnnotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id || id.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Annotation ID is required',
            code: 'MISSING_ANNOTATION_ID'
          }
        } as ApiResponse);
        return;
      }
      
      const annotation = await this.annotationService.getAnnotation(id);
      
      if (!annotation) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Annotation not found',
            code: 'ANNOTATION_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: annotation
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting annotation:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get annotation',
          code: 'ANNOTATION_GET_FAILED'
        }
      } as ApiResponse);
    }
  };

  // GET /api/sessions/:sessionId/annotations
  getSessionAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId || sessionId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Session ID is required',
            code: 'MISSING_SESSION_ID'
          }
        } as ApiResponse);
        return;
      }
      
      const annotations = await this.annotationService.getSessionAnnotations(sessionId);
      
      res.json({
        success: true,
        data: annotations
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting session annotations:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get session annotations',
          code: 'SESSION_ANNOTATIONS_GET_FAILED'
        }
      } as ApiResponse);
    }
  };

  // GET /api/users/:userId/annotations
  getUserAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.userId;

      if (!userId || userId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID is required',
            code: 'MISSING_USER_ID'
          }
        } as ApiResponse);
        return;
      }

      // Users can only access their own annotations
      if (userId !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          }
        } as ApiResponse);
        return;
      }
      
      const annotations = await this.annotationService.getUserAnnotations(userId);
      
      res.json({
        success: true,
        data: annotations
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting user annotations:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get user annotations',
          code: 'USER_ANNOTATIONS_GET_FAILED'
        }
      } as ApiResponse);
    }
  };

  // PUT /api/annotations/:id
  updateAnnotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      if (!id || id.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Annotation ID is required',
            code: 'MISSING_ANNOTATION_ID'
          }
        } as ApiResponse);
        return;
      }

      // Check if annotation exists and user owns it
      const existingAnnotation = await this.annotationService.getAnnotation(id);
      if (!existingAnnotation) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Annotation not found',
            code: 'ANNOTATION_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      if (existingAnnotation.userId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          }
        } as ApiResponse);
        return;
      }

      const updates: UpdateAnnotationRequest = {};
      
      if (req.body.content !== undefined) {
        if (req.body.content.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Annotation content cannot be empty',
              code: 'EMPTY_CONTENT'
            }
          } as ApiResponse);
          return;
        }
        if (req.body.content.length > 5000) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Annotation content exceeds maximum length of 5000 characters',
              code: 'CONTENT_TOO_LONG'
            }
          } as ApiResponse);
          return;
        }
        updates.content = req.body.content.trim();
      }
      
      if (req.body.type !== undefined) {
        if (!['comment', 'suggestion', 'question'].includes(req.body.type)) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Invalid annotation type. Must be comment, suggestion, or question',
              code: 'INVALID_TYPE'
            }
          } as ApiResponse);
          return;
        }
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

      // Validate line and column ranges if provided
      if (updates.lineStart !== undefined || updates.lineEnd !== undefined) {
        const lineStart = updates.lineStart ?? existingAnnotation.lineStart;
        const lineEnd = updates.lineEnd ?? existingAnnotation.lineEnd;
        if (lineStart < 0 || lineEnd < lineStart) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Invalid line range',
              code: 'INVALID_LINE_RANGE'
            }
          } as ApiResponse);
          return;
        }
      }

      if (updates.columnStart !== undefined || updates.columnEnd !== undefined) {
        const columnStart = updates.columnStart ?? existingAnnotation.columnStart;
        const columnEnd = updates.columnEnd ?? existingAnnotation.columnEnd;
        if (columnStart < 0 || columnEnd < 0) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Invalid column range',
              code: 'INVALID_COLUMN_RANGE'
            }
          } as ApiResponse);
          return;
        }
      }

      const updatedAnnotation = await this.annotationService.updateAnnotation(id, updates);
      
      res.json({
        success: true,
        data: updatedAnnotation
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating annotation:', error);
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update annotation',
          code: 'ANNOTATION_UPDATE_FAILED'
        }
      } as ApiResponse);
    }
  };

  // DELETE /api/annotations/:id
  deleteAnnotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      if (!id || id.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Annotation ID is required',
            code: 'MISSING_ANNOTATION_ID'
          }
        } as ApiResponse);
        return;
      }

      // Check if annotation exists and user owns it
      const existingAnnotation = await this.annotationService.getAnnotation(id);
      if (!existingAnnotation) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Annotation not found',
            code: 'ANNOTATION_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      if (existingAnnotation.userId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          }
        } as ApiResponse);
        return;
      }

      const deleted = await this.annotationService.deleteAnnotation(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Annotation not found',
            code: 'ANNOTATION_NOT_FOUND'
          }
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: 'Annotation deleted successfully'
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting annotation:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete annotation',
          code: 'ANNOTATION_DELETE_FAILED'
        }
      } as ApiResponse);
    }
  };

  // GET /api/sessions/:sessionId/annotations/line-range
  getAnnotationsByLineRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { lineStart, lineEnd } = req.query;

      if (!sessionId || sessionId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Session ID is required',
            code: 'MISSING_SESSION_ID'
          }
        } as ApiResponse);
        return;
      }

      if (!lineStart || !lineEnd) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Missing required query parameters: lineStart, lineEnd',
            code: 'MISSING_QUERY_PARAMETERS'
          }
        } as ApiResponse);
        return;
      }

      const lineStartNum = parseInt(lineStart as string);
      const lineEndNum = parseInt(lineEnd as string);

      if (isNaN(lineStartNum) || isNaN(lineEndNum)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'lineStart and lineEnd must be valid numbers',
            code: 'INVALID_LINE_NUMBERS'
          }
        } as ApiResponse);
        return;
      }

      if (lineStartNum < 0 || lineEndNum < lineStartNum) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid line range',
            code: 'INVALID_LINE_RANGE'
          }
        } as ApiResponse);
        return;
      }

      const annotations = await this.annotationService.getAnnotationsByLineRange(
        sessionId,
        lineStartNum,
        lineEndNum
      );
      
      res.json({
        success: true,
        data: annotations
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting annotations by line range:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get annotations by line range',
          code: 'LINE_RANGE_ANNOTATIONS_GET_FAILED'
        }
      } as ApiResponse);
    }
  };

  // DELETE /api/sessions/:sessionId/annotations
  clearSessionAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      if (!sessionId || sessionId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Session ID is required',
            code: 'MISSING_SESSION_ID'
          }
        } as ApiResponse);
        return;
      }

      // Only session creator or admin can clear all annotations
      // This would require session validation - for now, allow any authenticated user
      
      const deletedCount = await this.annotationService.clearSessionAnnotations(sessionId);
      
      res.json({
        success: true,
        message: `Deleted ${deletedCount} annotations`,
        data: { deletedCount }
      } as ApiResponse);
    } catch (error) {
      console.error('Error clearing session annotations:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to clear session annotations',
          code: 'CLEAR_SESSION_ANNOTATIONS_FAILED'
        }
      } as ApiResponse);
    }
  };

  // GET /api/annotations/search
  searchAnnotations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, sessionId, type, userId } = req.query;
      const requestingUserId = req.user?.userId;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      // If searching by userId, ensure user can only search their own annotations
      if (userId && userId !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          }
        } as ApiResponse);
        return;
      }

      const searchParams = {
        query: q as string,
        sessionId: sessionId as string,
        type: type as 'comment' | 'suggestion' | 'question',
        userId: userId as string || requestingUserId
      };

      const annotations = await this.annotationService.searchAnnotations(searchParams);
      
      res.json({
        success: true,
        data: annotations
      } as ApiResponse);
    } catch (error) {
      console.error('Error searching annotations:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to search annotations',
          code: 'ANNOTATION_SEARCH_FAILED'
        }
      } as ApiResponse);
    }
  };

  // GET /api/annotations/stats
  getAnnotationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        } as ApiResponse);
        return;
      }

      const stats = await this.annotationService.getAnnotationStats(
        sessionId as string,
        userId
      );
      
      res.json({
        success: true,
        data: stats
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting annotation stats:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get annotation stats',
          code: 'ANNOTATION_STATS_FAILED'
        }
      } as ApiResponse);
    }
  };
}