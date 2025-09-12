import { Pool } from 'pg';
import Redis from 'ioredis';
import { Annotation, AnnotationData } from '../models/Annotation';
import { AnnotationRepository } from '../repositories/AnnotationRepository';
import { pool, redis } from '../config/database';

export interface CreateAnnotationRequest {
  userId: string;
  sessionId: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  content: string;
  type: 'comment' | 'suggestion' | 'question';
}

export interface UpdateAnnotationRequest {
  content?: string;
  type?: 'comment' | 'suggestion' | 'question';
  lineStart?: number;
  lineEnd?: number;
  columnStart?: number;
  columnEnd?: number;
}

export interface SearchAnnotationsParams {
  query?: string;
  sessionId?: string;
  type?: 'comment' | 'suggestion' | 'question';
  userId?: string;
}

export interface AnnotationStats {
  total: number;
  byType: {
    comment: number;
    suggestion: number;
    question: number;
  };
  byUser: Array<{
    userId: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    content: string;
    type: 'comment' | 'suggestion' | 'question';
    createdAt: Date;
    userId: string;
  }>;
}

export class AnnotationService {
  private repository: AnnotationRepository;
  private redis: Redis;
  private readonly CACHE_PREFIX = 'annotations:session:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(dbPool: Pool = pool, redisClient: Redis = redis) {
    this.repository = new AnnotationRepository(dbPool);
    this.redis = redisClient;
  }

  async createAnnotation(request: CreateAnnotationRequest): Promise<AnnotationData> {
    // Validate input
    if (!request.content.trim()) {
      throw new Error('Annotation content cannot be empty');
    }

    if (request.lineStart < 0 || request.lineEnd < request.lineStart) {
      throw new Error('Invalid line range');
    }

    if (request.columnStart < 0 || request.columnEnd < 0) {
      throw new Error('Invalid column range');
    }

    // Create annotation
    const annotation = new Annotation(
      request.userId,
      request.sessionId,
      request.lineStart,
      request.lineEnd,
      request.columnStart,
      request.columnEnd,
      request.content,
      request.type
    );

    // Validate annotation
    if (!annotation.isValid()) {
      throw new Error('Invalid annotation data');
    }

    // Save to database
    const savedAnnotation = await this.repository.create(annotation);

    // Invalidate cache
    await this.invalidateSessionCache(request.sessionId);

    return savedAnnotation;
  }

  async getAnnotation(id: string): Promise<AnnotationData | null> {
    return await this.repository.findById(id);
  }

  async getSessionAnnotations(sessionId: string): Promise<AnnotationData[]> {
    // Try cache first
    const cacheKey = `${this.CACHE_PREFIX}${sessionId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const annotations = JSON.parse(cached);
        // Convert date strings back to Date objects
        return annotations.map((ann: any) => ({
          ...ann,
          createdAt: new Date(ann.createdAt),
          updatedAt: new Date(ann.updatedAt)
        }));
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    // Get from database
    const annotations = await this.repository.findBySessionId(sessionId);

    // Cache the result
    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(annotations));
    } catch (error) {
      console.warn('Cache write error:', error);
    }

    return annotations;
  }

  async getUserAnnotations(userId: string): Promise<AnnotationData[]> {
    return await this.repository.findByUserId(userId);
  }

  async updateAnnotation(id: string, updates: UpdateAnnotationRequest): Promise<AnnotationData> {
    // Get existing annotation
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Annotation not found');
    }

    // Create updated annotation
    const annotation = Annotation.fromJSON(existing);
    
    if (updates.content !== undefined) {
      annotation.updateContent(updates.content);
    }
    
    if (updates.type !== undefined) {
      annotation.type = updates.type;
      annotation.updatedAt = new Date();
    }

    if (updates.lineStart !== undefined || updates.lineEnd !== undefined ||
        updates.columnStart !== undefined || updates.columnEnd !== undefined) {
      annotation.updatePosition(
        updates.lineStart ?? annotation.lineStart,
        updates.lineEnd ?? annotation.lineEnd,
        updates.columnStart ?? annotation.columnStart,
        updates.columnEnd ?? annotation.columnEnd
      );
    }

    // Validate updated annotation
    if (!annotation.isValid()) {
      throw new Error('Invalid annotation data after update');
    }

    // Save to database
    const updatedAnnotation = await this.repository.update(annotation);

    // Invalidate cache
    await this.invalidateSessionCache(existing.sessionId);

    return updatedAnnotation;
  }

  async deleteAnnotation(id: string): Promise<boolean> {
    // Get annotation to find session ID for cache invalidation
    const annotation = await this.repository.findById(id);
    if (!annotation) {
      return false;
    }

    // Delete from database
    const deleted = await this.repository.delete(id);

    if (deleted) {
      // Invalidate cache
      await this.invalidateSessionCache(annotation.sessionId);
    }

    return deleted;
  }

  async getAnnotationsByLineRange(
    sessionId: string, 
    lineStart: number, 
    lineEnd: number
  ): Promise<AnnotationData[]> {
    return await this.repository.findByLineRange(sessionId, lineStart, lineEnd);
  }

  async clearSessionAnnotations(sessionId: string): Promise<number> {
    const deletedCount = await this.repository.deleteBySessionId(sessionId);
    
    // Invalidate cache
    await this.invalidateSessionCache(sessionId);
    
    return deletedCount;
  }

  async searchAnnotations(params: SearchAnnotationsParams): Promise<AnnotationData[]> {
    return await this.repository.search(params);
  }

  async getAnnotationStats(sessionId?: string, userId?: string): Promise<AnnotationStats> {
    return await this.repository.getStats(sessionId, userId);
  }

  private async invalidateSessionCache(sessionId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${sessionId}`;
      await this.redis.del(cacheKey);
    } catch (error) {
      console.warn('Cache invalidation error (Redis unavailable):', (error as Error).message);
    }
  }
}