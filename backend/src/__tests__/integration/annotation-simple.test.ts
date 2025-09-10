// Mock the database and redis first
jest.mock('../../config/database', () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockImplementation((sql, params) => {
        // Mock successful annotation creation
        if (sql.includes('INSERT INTO annotations')) {
          return Promise.resolve({
            rows: [{
              id: params[0], // annotation.id
              user_id: params[1], // annotation.userId
              session_id: params[2], // annotation.sessionId
              line_start: params[3], // annotation.lineStart
              line_end: params[4], // annotation.lineEnd
              column_start: params[5], // annotation.columnStart
              column_end: params[6], // annotation.columnEnd
              content: params[7], // annotation.content
              type: params[8], // annotation.type
              created_at: params[9], // annotation.createdAt
              updated_at: params[10] // annotation.updatedAt
            }],
            rowCount: 1
          });
        }
        // Mock other queries
        return Promise.resolve({ 
          rows: [], 
          rowCount: 0 
        });
      }),
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

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123' };
    next();
  })
}));

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { AnnotationController } from '../../controllers/AnnotationController';
import { AnnotationService } from '../../services/AnnotationService';

describe('Annotation API Integration Tests', () => {
  let app: express.Application;
  let annotationController: AnnotationController;

  beforeAll(() => {
    app = express();
    app.use(cors());
    app.use(express.json());

    // Mock the annotation service
    const annotationService = new AnnotationService();
    annotationController = new AnnotationController();

    // Import the mocked middleware
    const { authenticateToken } = require('../../middleware/auth');

    // Add routes with authentication middleware
    app.post('/api/annotations', authenticateToken, annotationController.createAnnotation);
    app.get('/api/annotations/:id', authenticateToken, annotationController.getAnnotation);
    app.put('/api/annotations/:id', authenticateToken, annotationController.updateAnnotation);
    app.delete('/api/annotations/:id', authenticateToken, annotationController.deleteAnnotation);
    app.get('/api/sessions/:sessionId/annotations', annotationController.getSessionAnnotations);
    app.get('/api/users/:userId/annotations', authenticateToken, annotationController.getUserAnnotations);
    app.get('/api/sessions/:sessionId/annotations/line-range', annotationController.getAnnotationsByLineRange);
    app.delete('/api/sessions/:sessionId/annotations', authenticateToken, annotationController.clearSessionAnnotations);
  });

  describe('POST /api/annotations', () => {
    it('should create annotation with valid data', async () => {
      const annotationData = {
        sessionId: 'session-123',
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'This is a test comment',
        type: 'comment'
      };

      const response = await request(app)
        .post('/api/annotations')
        .send(annotationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        sessionId: 'session-123',
        lineStart: 1,
        lineEnd: 3,
        columnStart: 0,
        columnEnd: 10,
        content: 'This is a test comment',
        type: 'comment',
        userId: 'test-user-123'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        sessionId: 'session-123',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/annotations')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid line range', async () => {
      const invalidData = {
        sessionId: 'session-123',
        lineStart: 5,
        lineEnd: 3, // Invalid: end < start
        columnStart: 0,
        columnEnd: 10,
        content: 'Test comment',
        type: 'comment'
      };

      const response = await request(app)
        .post('/api/annotations')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Invalid line range');
    });
  });

  describe('GET /api/sessions/:sessionId/annotations', () => {
    it('should return empty array for session with no annotations', async () => {
      const response = await request(app)
        .get('/api/sessions/session-123/annotations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/annotations/:id', () => {
    it('should return 404 for non-existent annotation', async () => {
      const response = await request(app)
        .get('/api/annotations/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Annotation not found');
    });
  });

  describe('PUT /api/annotations/:id', () => {
    it('should return 404 for non-existent annotation', async () => {
      const response = await request(app)
        .put('/api/annotations/non-existent-id')
        .send({ content: 'Updated content' })
        .expect(404);

      expect(response.body.error).toBe('Annotation not found');
    });
  });

  describe('DELETE /api/annotations/:id', () => {
    it('should return 404 for non-existent annotation', async () => {
      const response = await request(app)
        .delete('/api/annotations/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Annotation not found');
    });
  });

  describe('GET /api/sessions/:sessionId/annotations/line-range', () => {
    it('should return 400 for missing query parameters', async () => {
      const response = await request(app)
        .get('/api/sessions/session-123/annotations/line-range')
        .expect(400);

      expect(response.body.error).toContain('Missing required query parameters');
    });

    it('should return empty array for valid line range', async () => {
      const response = await request(app)
        .get('/api/sessions/session-123/annotations/line-range')
        .query({ lineStart: 1, lineEnd: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/sessions/:sessionId/annotations', () => {
    it('should clear session annotations', async () => {
      const response = await request(app)
        .delete('/api/sessions/session-123/annotations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedCount).toBe(0);
    });
  });
});
