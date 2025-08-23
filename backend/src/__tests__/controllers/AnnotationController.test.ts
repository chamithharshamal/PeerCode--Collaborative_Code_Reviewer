import { Request, Response } from 'express';
import { AnnotationController } from '../../controllers/AnnotationController';
import { AnnotationService } from '../../services/AnnotationService';
import { AnnotationData } from '../../models/Annotation';

// Mock AnnotationService
jest.mock('../../services/AnnotationService');
const MockedAnnotationService = AnnotationService as jest.MockedClass<typeof AnnotationService>;

describe('AnnotationController', () => {
  let controller: AnnotationController;
  let mockService: jest.Mocked<AnnotationService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockService = new MockedAnnotationService() as jest.Mocked<AnnotationService>;
    controller = new AnnotationController();
    (controller as any).annotationService = mockService;

    mockRequest = {
      user: { userId: 'user-123', email: 'test@example.com', username: 'testuser' },
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  const mockAnnotationData: AnnotationData = {
    id: 'annotation-123',
    userId: 'user-123',
    sessionId: 'session-456',
    lineStart: 0,
    lineEnd: 2,
    columnStart: 5,
    columnEnd: 10,
    content: 'Test annotation',
    type: 'comment',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  describe('createAnnotation', () => {
    beforeEach(() => {
      mockRequest.body = {
        sessionId: 'session-456',
        lineStart: 0,
        lineEnd: 2,
        columnStart: 5,
        columnEnd: 10,
        content: 'Test annotation',
        type: 'comment',
      };
    });

    it('should create annotation successfully', async () => {
      mockService.createAnnotation.mockResolvedValue(mockAnnotationData);

      await controller.createAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockService.createAnnotation).toHaveBeenCalledWith({
        userId: 'user-123',
        sessionId: 'session-456',
        lineStart: 0,
        lineEnd: 2,
        columnStart: 5,
        columnEnd: 10,
        content: 'Test annotation',
        type: 'comment',
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnnotationData,
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.createAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
      expect(mockService.createAnnotation).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields missing', async () => {
      mockRequest.body = { sessionId: 'session-456' }; // Missing other fields

      await controller.createAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing required fields: sessionId, lineStart, lineEnd, columnStart, columnEnd, content',
      });
      expect(mockService.createAnnotation).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockService.createAnnotation.mockRejectedValue(new Error('Service error'));

      await controller.createAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Service error',
      });
    });
  });

  describe('getAnnotation', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'annotation-123' };
    });

    it('should get annotation successfully', async () => {
      mockService.getAnnotation.mockResolvedValue(mockAnnotationData);

      await controller.getAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockService.getAnnotation).toHaveBeenCalledWith('annotation-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnnotationData,
      });
    });

    it('should return 404 when annotation not found', async () => {
      mockService.getAnnotation.mockResolvedValue(null);

      await controller.getAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Annotation not found',
      });
    });
  });

  describe('getSessionAnnotations', () => {
    beforeEach(() => {
      mockRequest.params = { sessionId: 'session-456' };
    });

    it('should get session annotations successfully', async () => {
      mockService.getSessionAnnotations.mockResolvedValue([mockAnnotationData]);

      await controller.getSessionAnnotations(mockRequest as Request, mockResponse as Response);

      expect(mockService.getSessionAnnotations).toHaveBeenCalledWith('session-456');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [mockAnnotationData],
      });
    });
  });

  describe('updateAnnotation', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'annotation-123' };
      mockRequest.body = { content: 'Updated content' };
    });

    it('should update annotation successfully', async () => {
      const updatedData = { ...mockAnnotationData, content: 'Updated content' };
      mockService.getAnnotation.mockResolvedValue(mockAnnotationData);
      mockService.updateAnnotation.mockResolvedValue(updatedData);

      await controller.updateAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockService.getAnnotation).toHaveBeenCalledWith('annotation-123');
      expect(mockService.updateAnnotation).toHaveBeenCalledWith('annotation-123', {
        content: 'Updated content',
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedData,
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.updateAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });

    it('should return 404 when annotation not found', async () => {
      mockService.getAnnotation.mockResolvedValue(null);

      await controller.updateAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Annotation not found',
      });
    });

    it('should return 403 when user does not own annotation', async () => {
      const otherUserAnnotation = { ...mockAnnotationData, userId: 'other-user' };
      mockService.getAnnotation.mockResolvedValue(otherUserAnnotation);

      await controller.updateAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access denied',
      });
    });


  });

  describe('deleteAnnotation', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'annotation-123' };
    });

    it('should delete annotation successfully', async () => {
      mockService.getAnnotation.mockResolvedValue(mockAnnotationData);
      mockService.deleteAnnotation.mockResolvedValue(true);

      await controller.deleteAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockService.getAnnotation).toHaveBeenCalledWith('annotation-123');
      expect(mockService.deleteAnnotation).toHaveBeenCalledWith('annotation-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Annotation deleted successfully',
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.deleteAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });

    it('should return 403 when user does not own annotation', async () => {
      const otherUserAnnotation = { ...mockAnnotationData, userId: 'other-user' };
      mockService.getAnnotation.mockResolvedValue(otherUserAnnotation);

      await controller.deleteAnnotation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access denied',
      });
    });
  });

  describe('getAnnotationsByLineRange', () => {
    beforeEach(() => {
      mockRequest.params = { sessionId: 'session-456' };
      mockRequest.query = { lineStart: '0', lineEnd: '5' };
    });

    it('should get annotations by line range successfully', async () => {
      mockService.getAnnotationsByLineRange.mockResolvedValue([mockAnnotationData]);

      await controller.getAnnotationsByLineRange(mockRequest as Request, mockResponse as Response);

      expect(mockService.getAnnotationsByLineRange).toHaveBeenCalledWith('session-456', 0, 5);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [mockAnnotationData],
      });
    });

    it('should return 400 when query parameters missing', async () => {
      mockRequest.query = {};

      await controller.getAnnotationsByLineRange(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: lineStart, lineEnd',
      });
    });
  });
});