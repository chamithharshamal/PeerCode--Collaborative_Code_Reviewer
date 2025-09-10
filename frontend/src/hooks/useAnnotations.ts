'use client';

import { useState, useEffect, useCallback } from 'react';
import { Annotation } from '@/types';
import { annotationAPI, CreateAnnotationRequest, UpdateAnnotationRequest } from '@/lib/annotation-api';
import { useSocket } from './useSocket';

export interface UseAnnotationsOptions {
  sessionId: string;
  userId?: string;
  onError?: (error: string) => void;
}

export interface UseAnnotationsReturn {
  annotations: Annotation[];
  loading: boolean;
  error: string | null;
  createAnnotation: (request: Omit<CreateAnnotationRequest, 'sessionId'>) => Promise<boolean>;
  updateAnnotation: (id: string, updates: UpdateAnnotationRequest) => Promise<boolean>;
  deleteAnnotation: (id: string) => Promise<boolean>;
  refreshAnnotations: () => Promise<void>;
  clearAllAnnotations: () => Promise<boolean>;
  getAnnotationsByLineRange: (lineStart: number, lineEnd: number) => Promise<Annotation[]>;
}

export const useAnnotations = ({
  sessionId,
  userId,
  onError
}: UseAnnotationsOptions): UseAnnotationsReturn => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connected, emit, on, off } = useSocket({
    autoConnect: true,
    onError: (error) => {
      setError(error);
      onError?.(error);
    }
  });

  // Load annotations when session changes
  const refreshAnnotations = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await annotationAPI.getSessionAnnotations(sessionId);
      
      if (response.success && response.data) {
        setAnnotations(response.data);
      } else {
        throw new Error(response.error || 'Failed to load annotations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load annotations';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId, onError]);

  // Create annotation
  const createAnnotation = useCallback(async (
    request: Omit<CreateAnnotationRequest, 'sessionId'>
  ): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await annotationAPI.createAnnotation({
        ...request,
        sessionId
      });

      if (response.success && response.data) {
        // Add to local state immediately for optimistic update
        setAnnotations(prev => [...prev, response.data!]);
        return true;
      } else {
        throw new Error(response.error || 'Failed to create annotation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create annotation';
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [sessionId, onError]);

  // Update annotation
  const updateAnnotation = useCallback(async (
    id: string,
    updates: UpdateAnnotationRequest
  ): Promise<boolean> => {
    try {
      const response = await annotationAPI.updateAnnotation(id, updates);

      if (response.success && response.data) {
        // Update local state
        setAnnotations(prev => 
          prev.map(ann => ann.id === id ? response.data! : ann)
        );
        return true;
      } else {
        throw new Error(response.error || 'Failed to update annotation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update annotation';
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  // Delete annotation
  const deleteAnnotation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await annotationAPI.deleteAnnotation(id);

      if (response.success) {
        // Remove from local state
        setAnnotations(prev => prev.filter(ann => ann.id !== id));
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete annotation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete annotation';
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  // Clear all annotations
  const clearAllAnnotations = useCallback(async (): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await annotationAPI.clearSessionAnnotations(sessionId);

      if (response.success) {
        setAnnotations([]);
        return true;
      } else {
        throw new Error(response.error || 'Failed to clear annotations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear annotations';
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [sessionId, onError]);

  // Get annotations by line range
  const getAnnotationsByLineRange = useCallback(async (
    lineStart: number,
    lineEnd: number
  ): Promise<Annotation[]> => {
    if (!sessionId) return [];

    try {
      const response = await annotationAPI.getAnnotationsByLineRange(sessionId, lineStart, lineEnd);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get annotations by line range');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get annotations by line range';
      setError(errorMessage);
      onError?.(errorMessage);
      return [];
    }
  }, [sessionId, onError]);

  // Real-time WebSocket event handlers
  useEffect(() => {
    if (!connected) return;

    const handleAnnotationAdded = (data: { annotation: Annotation; userId: string }) => {
      setAnnotations(prev => {
        // Check if annotation already exists (avoid duplicates)
        const exists = prev.some(ann => ann.id === data.annotation.id);
        if (exists) return prev;
        return [...prev, data.annotation];
      });
    };

    const handleAnnotationUpdated = (data: { annotation: Annotation; userId: string }) => {
      setAnnotations(prev => 
        prev.map(ann => ann.id === data.annotation.id ? data.annotation : ann)
      );
    };

    const handleAnnotationDeleted = (data: { annotationId: string; userId: string }) => {
      setAnnotations(prev => prev.filter(ann => ann.id !== data.annotationId));
    };

    // Listen to real-time annotation events
    on('annotation-added', handleAnnotationAdded);
    on('annotation-updated', handleAnnotationUpdated);
    on('annotation-deleted', handleAnnotationDeleted);

    return () => {
      off('annotation-added', handleAnnotationAdded);
      off('annotation-updated', handleAnnotationUpdated);
      off('annotation-deleted', handleAnnotationDeleted);
    };
  }, [connected, on, off]);

  // Load annotations on mount and when session changes
  useEffect(() => {
    refreshAnnotations();
  }, [refreshAnnotations]);

  return {
    annotations,
    loading,
    error,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refreshAnnotations,
    clearAllAnnotations,
    getAnnotationsByLineRange
  };
};
