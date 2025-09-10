import { AnnotationService } from '../../services/AnnotationService';
import { Annotation } from '../../models/Annotation';

// Mock the database pool and redis
jest.mock('../../config/database', () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn()
    }),
    end: jest.fn()
  },
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn()
  }
}));

describe('AnnotationService', () => {
  let annotationService: AnnotationService;

  beforeEach(() => {
    annotationService = new AnnotationService();
  });

  describe('createAnnotation', () => {
    it('should create a valid annotation', async () => {
      const request = {
        userId: 'user-123',
        sessionId: 'session-123',
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'This is a test comment',
        type: 'comment' as const
      };

      const result = await annotationService.createAnnotation(request);

      expect(result).toMatchObject({
        userId: 'user-123',
        sessionId: 'session-123',
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'This is a test comment',
        type: 'comment'
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for empty content', async () => {
      const request = {
        userId: 'user-123',
        sessionId: 'session-123',
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: '',
        type: 'comment' as const
      };

      await expect(annotationService.createAnnotation(request))
        .rejects.toThrow('Annotation content cannot be empty');
    });

    it('should throw error for invalid line range', async () => {
      const request = {
        userId: 'user-123',
        sessionId: 'session-123',
        lineStart: 5,
        lineEnd: 3, // Invalid: end < start
        columnStart: 0,
        columnEnd: 10,
        content: 'Test comment',
        type: 'comment' as const
      };

      await expect(annotationService.createAnnotation(request))
        .rejects.toThrow('Invalid line range');
    });

    it('should throw error for negative line numbers', async () => {
      const request = {
        userId: 'user-123',
        sessionId: 'session-123',
        lineStart: -1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'Test comment',
        type: 'comment' as const
      };

      await expect(annotationService.createAnnotation(request))
        .rejects.toThrow('Invalid line range');
    });

    it('should throw error for negative column numbers', async () => {
      const request = {
        userId: 'user-123',
        sessionId: 'session-123',
        lineStart: 1,
        lineEnd: 3,
        columnStart: -1,
        columnEnd: 10,
        content: 'Test comment',
        type: 'comment' as const
      };

      await expect(annotationService.createAnnotation(request))
        .rejects.toThrow('Invalid column range');
    });
  });

  describe('getSessionAnnotations', () => {
    it('should return empty array when no annotations exist', async () => {
      const result = await annotationService.getSessionAnnotations('session-123');
      expect(result).toEqual([]);
    });
  });

  describe('updateAnnotation', () => {
    it('should throw error for non-existent annotation', async () => {
      await expect(annotationService.updateAnnotation('non-existent-id', {
        content: 'Updated content'
      })).rejects.toThrow('Annotation not found');
    });
  });

  describe('deleteAnnotation', () => {
    it('should return false for non-existent annotation', async () => {
      const result = await annotationService.deleteAnnotation('non-existent-id');
      expect(result).toBe(false);
    });
  });
});
