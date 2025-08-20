import Redis from 'ioredis';
import { Annotation } from '../types';
import { redis } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class AnnotationService {
  private redis: Redis;
  private readonly ANNOTATIONS_PREFIX = 'session_annotations:';
  private readonly ANNOTATION_TIMEOUT = 3600; // 1 hour in seconds

  constructor(redisClient: Redis = redis) {
    this.redis = redisClient;
  }

  async addAnnotation(sessionId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>): Promise<Annotation> {
    const newAnnotation: Annotation = {
      ...annotation,
      id: uuidv4(),
      createdAt: new Date(),
    };

    try {
      const key = `${this.ANNOTATIONS_PREFIX}${sessionId}`;
      
      // Store annotation in Redis as a hash field
      await this.redis.hset(key, newAnnotation.id, JSON.stringify(newAnnotation));
      await this.redis.expire(key, this.ANNOTATION_TIMEOUT);

      return newAnnotation;
    } catch (error) {
      console.error('Error adding annotation:', error);
      throw new Error('Failed to add annotation');
    }
  }

  async getSessionAnnotations(sessionId: string): Promise<Annotation[]> {
    try {
      const key = `${this.ANNOTATIONS_PREFIX}${sessionId}`;
      const annotationsHash = await this.redis.hgetall(key);
      
      const annotations: Annotation[] = [];
      for (const annotationJson of Object.values(annotationsHash)) {
        try {
          const annotation = JSON.parse(annotationJson);
          // Convert date strings back to Date objects
          annotation.createdAt = new Date(annotation.createdAt);
          annotations.push(annotation);
        } catch (parseError) {
          console.error('Error parsing annotation:', parseError);
        }
      }

      // Sort by creation time
      return annotations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      console.error('Error getting session annotations:', error);
      return [];
    }
  }

  async removeAnnotation(sessionId: string, annotationId: string): Promise<boolean> {
    try {
      const key = `${this.ANNOTATIONS_PREFIX}${sessionId}`;
      const result = await this.redis.hdel(key, annotationId);
      return result > 0;
    } catch (error) {
      console.error('Error removing annotation:', error);
      return false;
    }
  }

  async updateAnnotation(sessionId: string, annotationId: string, updates: Partial<Annotation>): Promise<Annotation | null> {
    try {
      const key = `${this.ANNOTATIONS_PREFIX}${sessionId}`;
      const existingAnnotationJson = await this.redis.hget(key, annotationId);
      
      if (!existingAnnotationJson) {
        return null;
      }

      const existingAnnotation = JSON.parse(existingAnnotationJson);
      const updatedAnnotation: Annotation = {
        ...existingAnnotation,
        ...updates,
        id: annotationId, // Ensure ID doesn't change
        createdAt: new Date(existingAnnotation.createdAt), // Preserve original creation time
      };

      await this.redis.hset(key, annotationId, JSON.stringify(updatedAnnotation));
      return updatedAnnotation;
    } catch (error) {
      console.error('Error updating annotation:', error);
      return null;
    }
  }

  async clearSessionAnnotations(sessionId: string): Promise<void> {
    try {
      const key = `${this.ANNOTATIONS_PREFIX}${sessionId}`;
      await this.redis.del(key);
    } catch (error) {
      console.error('Error clearing session annotations:', error);
    }
  }

  async getAnnotationsByUser(sessionId: string, userId: string): Promise<Annotation[]> {
    try {
      const allAnnotations = await this.getSessionAnnotations(sessionId);
      return allAnnotations.filter(annotation => annotation.userId === userId);
    } catch (error) {
      console.error('Error getting annotations by user:', error);
      return [];
    }
  }

  async getAnnotationsByLine(sessionId: string, lineNumber: number): Promise<Annotation[]> {
    try {
      const allAnnotations = await this.getSessionAnnotations(sessionId);
      return allAnnotations.filter(annotation => 
        lineNumber >= annotation.lineStart && lineNumber <= annotation.lineEnd
      );
    } catch (error) {
      console.error('Error getting annotations by line:', error);
      return [];
    }
  }
}