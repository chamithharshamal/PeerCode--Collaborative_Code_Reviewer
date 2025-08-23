import { Annotation, AnnotationData } from '../../models/Annotation';

describe('Annotation Model', () => {
  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';
  const mockContent = 'This is a test annotation';

  describe('constructor', () => {
    it('should create a new annotation with valid data', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        2,
        5,
        10,
        mockContent,
        'comment'
      );

      expect(annotation.id).toBeDefined();
      expect(annotation.userId).toBe(mockUserId);
      expect(annotation.sessionId).toBe(mockSessionId);
      expect(annotation.lineStart).toBe(0);
      expect(annotation.lineEnd).toBe(2);
      expect(annotation.columnStart).toBe(5);
      expect(annotation.columnEnd).toBe(10);
      expect(annotation.content).toBe(mockContent);
      expect(annotation.type).toBe('comment');
      expect(annotation.createdAt).toBeInstanceOf(Date);
      expect(annotation.updatedAt).toBeInstanceOf(Date);
    });

    it('should default to comment type when not specified', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        0,
        0,
        5,
        mockContent
      );

      expect(annotation.type).toBe('comment');
    });
  });

  describe('updateContent', () => {
    it('should update content and updatedAt timestamp', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        0,
        0,
        5,
        mockContent
      );

      const originalUpdatedAt = annotation.updatedAt;
      const newContent = 'Updated content';

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        annotation.updateContent(newContent);

        expect(annotation.content).toBe(newContent);
        expect(annotation.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('updatePosition', () => {
    it('should update position and updatedAt timestamp', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        0,
        0,
        5,
        mockContent
      );

      const originalUpdatedAt = annotation.updatedAt;

      setTimeout(() => {
        annotation.updatePosition(1, 3, 10, 20);

        expect(annotation.lineStart).toBe(1);
        expect(annotation.lineEnd).toBe(3);
        expect(annotation.columnStart).toBe(10);
        expect(annotation.columnEnd).toBe(20);
        expect(annotation.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('isValid', () => {
    it('should return true for valid annotation', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        2,
        5,
        10,
        mockContent,
        'comment'
      );

      expect(annotation.isValid()).toBe(true);
    });

    it('should return false for empty content', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        0,
        0,
        5,
        '   '
      );

      expect(annotation.isValid()).toBe(false);
    });

    it('should return false for negative line numbers', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        -1,
        0,
        0,
        5,
        mockContent
      );

      expect(annotation.isValid()).toBe(false);
    });

    it('should return false for invalid line range', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        5,
        2,
        0,
        5,
        mockContent
      );

      expect(annotation.isValid()).toBe(false);
    });

    it('should return false for negative column numbers', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        0,
        -1,
        5,
        mockContent
      );

      expect(annotation.isValid()).toBe(false);
    });

    it('should return false for invalid annotation type', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        0,
        0,
        5,
        mockContent,
        'invalid' as any
      );

      expect(annotation.isValid()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize annotation to JSON format', () => {
      const annotation = new Annotation(
        mockUserId,
        mockSessionId,
        0,
        2,
        5,
        10,
        mockContent,
        'suggestion'
      );

      const json = annotation.toJSON();

      expect(json).toEqual({
        id: annotation.id,
        userId: mockUserId,
        sessionId: mockSessionId,
        lineStart: 0,
        lineEnd: 2,
        columnStart: 5,
        columnEnd: 10,
        content: mockContent,
        type: 'suggestion',
        createdAt: annotation.createdAt,
        updatedAt: annotation.updatedAt
      });
    });
  });

  describe('fromJSON', () => {
    it('should deserialize annotation from JSON format', () => {
      const annotationData: AnnotationData = {
        id: 'test-id',
        userId: mockUserId,
        sessionId: mockSessionId,
        lineStart: 0,
        lineEnd: 2,
        columnStart: 5,
        columnEnd: 10,
        content: mockContent,
        type: 'question',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      };

      const annotation = Annotation.fromJSON(annotationData);

      expect(annotation.id).toBe('test-id');
      expect(annotation.userId).toBe(mockUserId);
      expect(annotation.sessionId).toBe(mockSessionId);
      expect(annotation.lineStart).toBe(0);
      expect(annotation.lineEnd).toBe(2);
      expect(annotation.columnStart).toBe(5);
      expect(annotation.columnEnd).toBe(10);
      expect(annotation.content).toBe(mockContent);
      expect(annotation.type).toBe('question');
      expect(annotation.createdAt).toEqual(new Date('2023-01-01'));
      expect(annotation.updatedAt).toEqual(new Date('2023-01-02'));
    });
  });
});