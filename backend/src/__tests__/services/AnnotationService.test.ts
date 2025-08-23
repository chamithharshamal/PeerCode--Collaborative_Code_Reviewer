import { Pool } from 'pg';
import Redis from 'ioredis';
import { AnnotationService, CreateAnnotationRequest } from '../../services/AnnotationService';
import { AnnotationRepository } from '../../repositories/AnnotationRepository';
import { Annotation, AnnotationData } from '../../models/Annotation';

// Mock dependencies
jest.mock('../../repositories/AnnotationRepository');
jest.mock('ioredis');

const MockedAnnotationRepository = AnnotationRepository as jest.MockedClass<typeof AnnotationRepository>;
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('AnnotationService', () => {
  let service: AnnotationService;
  let mockRepository: jest.Mocked<AnnotationRepository>;
  let mockRedis: jest.Mocked<Redis>;
  let mockPool: Pool;

  beforeEach(() => {
    mockRepository = new MockedAnnotationRepository({} as Pool) as jest.Mocked<AnnotationRepository>;
    mockRedis = new MockedRedis() as jest.Mocked<Redis>;
    mockPool = {} as Pool;

    service = new AnnotationService(mockPool, mockRedis);
    (service as any).repository = mockRepository;

    jest.clearAllMocks();
  });

  const mockAnnotationData: AnnotationData = {
    id: 'annotation-123',
    userId: 'user-456',
    sessionId: 'session-789',
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
    const createRequest: CreateAnnotationRequest = {
      userId: 'user-456',
      sessionId: 'session-789',
      lineStart: 0,
      lineEnd: 2,
      columnStart: 5,
      columnEnd: 10,
      content: 'Test annotation',
      type: 'comment',
    };

    it('should create a new annotation', async () => {
      mockRepository.create.mockResolvedValue(mockAnnotationData);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.createAnnotation(createRequest);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: createRequest.userId,
          sessionId: createRequest.sessionId,
          lineStart: createRequest.lineStart,
          lineEnd: createRequest.lineEnd,
          columnStart: createRequest.columnStart,
          columnEnd: createRequest.columnEnd,
          content: createRequest.content,
          type: createRequest.type,
        })
      );

      expect(result).toEqual(mockAnnotationData);
      expect(mockRedis.del).toHaveBeenCalledWith('annotations:session:session-789');
    });

    it('should throw error for empty content', async () => {
      const invalidRequest = { ...createRequest, content: '   ' };

      await expect(service.createAnnotation(invalidRequest)).rejects.toThrow(
        'Annotation content cannot be empty'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for invalid line range', async () => {
      const invalidRequest = { ...createRequest, lineStart: 5, lineEnd: 2 };

      await expect(service.createAnnotation(invalidRequest)).rejects.toThrow(
        'Invalid line range'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for negative line numbers', async () => {
      const invalidRequest = { ...createRequest, lineStart: -1 };

      await expect(service.createAnnotation(invalidRequest)).rejects.toThrow(
        'Invalid line range'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for negative column numbers', async () => {
      const invalidRequest = { ...createRequest, columnStart: -1 };

      await expect(service.createAnnotation(invalidRequest)).rejects.toThrow(
        'Invalid column range'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getAnnotation', () => {
    it('should get annotation by id', async () => {
      mockRepository.findById.mockResolvedValue(mockAnnotationData);

      const result = await service.getAnnotation('annotation-123');

      expect(mockRepository.findById).toHaveBeenCalledWith('annotation-123');
      expect(result).toEqual(mockAnnotationData);
    });

    it('should return null when annotation not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getAnnotation('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSessionAnnotations', () => {
    it('should get annotations from cache when available', async () => {
      const cachedData = JSON.stringify([mockAnnotationData]);
      mockRedis.get.mockResolvedValue(cachedData);

      const result = await service.getSessionAnnotations('session-789');

      expect(mockRedis.get).toHaveBeenCalledWith('annotations:session:session-789');
      expect(mockRepository.findBySessionId).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...mockAnnotationData,
        createdAt: new Date(mockAnnotationData.createdAt),
        updatedAt: new Date(mockAnnotationData.updatedAt),
      });
    });

    it('should get annotations from database when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRepository.findBySessionId.mockResolvedValue([mockAnnotationData]);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getSessionAnnotations('session-789');

      expect(mockRedis.get).toHaveBeenCalledWith('annotations:session:session-789');
      expect(mockRepository.findBySessionId).toHaveBeenCalledWith('session-789');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'annotations:session:session-789',
        3600,
        JSON.stringify([mockAnnotationData])
      );
      expect(result).toEqual([mockAnnotationData]);
    });

    it('should handle cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Cache error'));
      mockRepository.findBySessionId.mockResolvedValue([mockAnnotationData]);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getSessionAnnotations('session-789');

      expect(mockRepository.findBySessionId).toHaveBeenCalledWith('session-789');
      expect(result).toEqual([mockAnnotationData]);
    });
  });

  describe('updateAnnotation', () => {
    it('should update annotation', async () => {
      const updatedData = { ...mockAnnotationData, content: 'Updated content' };
      mockRepository.findById.mockResolvedValue(mockAnnotationData);
      mockRepository.update.mockResolvedValue(updatedData);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.updateAnnotation('annotation-123', {
        content: 'Updated content',
      });

      expect(mockRepository.findById).toHaveBeenCalledWith('annotation-123');
      expect(mockRepository.update).toHaveBeenCalled();
      expect(result).toEqual(updatedData);
      expect(mockRedis.del).toHaveBeenCalledWith('annotations:session:session-789');
    });

    it('should throw error when annotation not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateAnnotation('non-existent', { content: 'Updated' })
      ).rejects.toThrow('Annotation not found');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAnnotation', () => {
    it('should delete annotation', async () => {
      mockRepository.findById.mockResolvedValue(mockAnnotationData);
      mockRepository.delete.mockResolvedValue(true);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.deleteAnnotation('annotation-123');

      expect(mockRepository.findById).toHaveBeenCalledWith('annotation-123');
      expect(mockRepository.delete).toHaveBeenCalledWith('annotation-123');
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('annotations:session:session-789');
    });

    it('should return false when annotation not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.deleteAnnotation('non-existent');

      expect(result).toBe(false);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getAnnotationsByLineRange', () => {
    it('should get annotations by line range', async () => {
      mockRepository.findByLineRange.mockResolvedValue([mockAnnotationData]);

      const result = await service.getAnnotationsByLineRange('session-789', 0, 5);

      expect(mockRepository.findByLineRange).toHaveBeenCalledWith('session-789', 0, 5);
      expect(result).toEqual([mockAnnotationData]);
    });
  });

  describe('clearSessionAnnotations', () => {
    it('should clear all session annotations', async () => {
      mockRepository.deleteBySessionId.mockResolvedValue(3);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.clearSessionAnnotations('session-789');

      expect(mockRepository.deleteBySessionId).toHaveBeenCalledWith('session-789');
      expect(result).toBe(3);
      expect(mockRedis.del).toHaveBeenCalledWith('annotations:session:session-789');
    });
  });
});