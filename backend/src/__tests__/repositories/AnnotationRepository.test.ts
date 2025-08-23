import { Pool } from 'pg';
import { AnnotationRepository } from '../../repositories/AnnotationRepository';
import { Annotation } from '../../models/Annotation';

// Mock pg Pool
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('AnnotationRepository', () => {
  let repository: AnnotationRepository;

  beforeEach(() => {
    repository = new AnnotationRepository(mockPool);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  const mockAnnotation = new Annotation(
    'user-123',
    'session-456',
    0,
    2,
    5,
    10,
    'Test annotation',
    'comment'
  );

  const mockDbRow = {
    id: mockAnnotation.id,
    user_id: mockAnnotation.userId,
    session_id: mockAnnotation.sessionId,
    line_start: mockAnnotation.lineStart,
    line_end: mockAnnotation.lineEnd,
    column_start: mockAnnotation.columnStart,
    column_end: mockAnnotation.columnEnd,
    content: mockAnnotation.content,
    type: mockAnnotation.type,
    created_at: mockAnnotation.createdAt,
    updated_at: mockAnnotation.updatedAt,
  };

  describe('create', () => {
    it('should create a new annotation', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.create(mockAnnotation);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO annotations'),
        expect.arrayContaining([
          mockAnnotation.id,
          mockAnnotation.userId,
          mockAnnotation.sessionId,
          mockAnnotation.lineStart,
          mockAnnotation.lineEnd,
          mockAnnotation.columnStart,
          mockAnnotation.columnEnd,
          mockAnnotation.content,
          mockAnnotation.type,
          mockAnnotation.createdAt,
          mockAnnotation.updatedAt,
        ])
      );

      expect(result).toEqual({
        id: mockAnnotation.id,
        userId: mockAnnotation.userId,
        sessionId: mockAnnotation.sessionId,
        lineStart: mockAnnotation.lineStart,
        lineEnd: mockAnnotation.lineEnd,
        columnStart: mockAnnotation.columnStart,
        columnEnd: mockAnnotation.columnEnd,
        content: mockAnnotation.content,
        type: mockAnnotation.type,
        createdAt: mockAnnotation.createdAt,
        updatedAt: mockAnnotation.updatedAt,
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValue(error);

      await expect(repository.create(mockAnnotation)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find annotation by id', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findById(mockAnnotation.id);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM annotations WHERE id = $1',
        [mockAnnotation.id]
      );

      expect(result).toEqual({
        id: mockAnnotation.id,
        userId: mockAnnotation.userId,
        sessionId: mockAnnotation.sessionId,
        lineStart: mockAnnotation.lineStart,
        lineEnd: mockAnnotation.lineEnd,
        columnStart: mockAnnotation.columnStart,
        columnEnd: mockAnnotation.columnEnd,
        content: mockAnnotation.content,
        type: mockAnnotation.type,
        createdAt: mockAnnotation.createdAt,
        updatedAt: mockAnnotation.updatedAt,
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when annotation not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findBySessionId', () => {
    it('should find annotations by session id', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findBySessionId('session-456');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM annotations'),
        ['session-456']
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockAnnotation.id,
        userId: mockAnnotation.userId,
        sessionId: mockAnnotation.sessionId,
        lineStart: mockAnnotation.lineStart,
        lineEnd: mockAnnotation.lineEnd,
        columnStart: mockAnnotation.columnStart,
        columnEnd: mockAnnotation.columnEnd,
        content: mockAnnotation.content,
        type: mockAnnotation.type,
        createdAt: mockAnnotation.createdAt,
        updatedAt: mockAnnotation.updatedAt,
      });

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should find annotations by user id', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findByUserId('user-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM annotations'),
        ['user-123']
      );

      expect(result).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an annotation', async () => {
      const updatedAnnotation = new Annotation(
        mockAnnotation.userId,
        mockAnnotation.sessionId,
        mockAnnotation.lineStart,
        mockAnnotation.lineEnd,
        mockAnnotation.columnStart,
        mockAnnotation.columnEnd,
        'Updated content',
        mockAnnotation.type
      );
      updatedAnnotation.id = mockAnnotation.id;
      updatedAnnotation.createdAt = mockAnnotation.createdAt;

      const updatedDbRow = { ...mockDbRow };
      updatedDbRow.content = 'Updated content';
      updatedDbRow.updated_at = updatedAnnotation.updatedAt;

      mockClient.query.mockResolvedValue({ rows: [updatedDbRow] });

      const result = await repository.update(updatedAnnotation);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE annotations'),
        expect.arrayContaining([
          'Updated content',
          updatedAnnotation.type,
          updatedAnnotation.lineStart,
          updatedAnnotation.lineEnd,
          updatedAnnotation.columnStart,
          updatedAnnotation.columnEnd,
          updatedAnnotation.updatedAt,
          updatedAnnotation.id,
        ])
      );

      expect(result.content).toBe('Updated content');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when annotation not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(repository.update(mockAnnotation)).rejects.toThrow(
        `Annotation with id ${mockAnnotation.id} not found`
      );

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an annotation', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await repository.delete(mockAnnotation.id);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM annotations WHERE id = $1',
        [mockAnnotation.id]
      );

      expect(result).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return false when annotation not found', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteBySessionId', () => {
    it('should delete all annotations for a session', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 3 });

      const result = await repository.deleteBySessionId('session-456');

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM annotations WHERE session_id = $1',
        ['session-456']
      );

      expect(result).toBe(3);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByLineRange', () => {
    it('should find annotations within line range', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findByLineRange('session-456', 0, 5);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM annotations'),
        ['session-456', 0, 5]
      );

      expect(result).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});