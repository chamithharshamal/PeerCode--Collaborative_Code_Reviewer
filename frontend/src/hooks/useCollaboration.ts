import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { User, Annotation, CodeRange, SessionState } from '@/types';

interface CollaborationState {
  participants: User[];
  sessionState: SessionState | null;
  annotations: Annotation[];
  typingUsers: Set<string>;
  isConnected: boolean;
}

interface UseCollaborationOptions {
  sessionId: string;
  onError?: (error: { message: string; code: string }) => void;
}

export const useCollaboration = ({ sessionId, onError }: UseCollaborationOptions) => {
  const { socket, connected, emit, on, off } = useSocket();
  const [state, setState] = useState<CollaborationState>({
    participants: [],
    sessionState: null,
    annotations: [],
    typingUsers: new Set(),
    isConnected: false,
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Join session when socket connects
  useEffect(() => {
    if (connected && sessionId) {
      emit('join-session', { sessionId, userId: 'current-user-id' }); // TODO: Get actual user ID
    }
  }, [connected, sessionId, emit]);

  // Handle session joined
  useEffect(() => {
    const handleSessionJoined = (data: { participants: User[]; sessionState: SessionState }) => {
      setState(prev => ({
        ...prev,
        participants: data.participants,
        sessionState: data.sessionState,
        annotations: data.sessionState.currentAnnotations,
        isConnected: true,
      }));
    };

    on('session-joined', handleSessionJoined);
    return () => off('session-joined', handleSessionJoined);
  }, [on, off]);

  // Handle user joined
  useEffect(() => {
    const handleUserJoined = (data: { user: User; participants: User[] }) => {
      setState(prev => ({
        ...prev,
        participants: data.participants,
      }));
    };

    on('user-joined', handleUserJoined);
    return () => off('user-joined', handleUserJoined);
  }, [on, off]);

  // Handle user left
  useEffect(() => {
    const handleUserLeft = (data: { userId: string; participants: User[] }) => {
      setState(prev => ({
        ...prev,
        participants: data.participants,
        typingUsers: new Set([...prev.typingUsers].filter(id => id !== data.userId)),
      }));
    };

    on('user-left', handleUserLeft);
    return () => off('user-left', handleUserLeft);
  }, [on, off]);

  // Handle annotation added
  useEffect(() => {
    const handleAnnotationAdded = (data: { annotation: Annotation; userId: string }) => {
      setState(prev => ({
        ...prev,
        annotations: [...prev.annotations, data.annotation],
      }));
    };

    on('annotation-added', handleAnnotationAdded);
    return () => off('annotation-added', handleAnnotationAdded);
  }, [on, off]);

  // Handle annotation updated
  useEffect(() => {
    const handleAnnotationUpdated = (data: { annotation: Annotation; userId: string }) => {
      setState(prev => ({
        ...prev,
        annotations: prev.annotations.map(ann => 
          ann.id === data.annotation.id ? data.annotation : ann
        ),
      }));
    };

    on('annotation-updated', handleAnnotationUpdated);
    return () => off('annotation-updated', handleAnnotationUpdated);
  }, [on, off]);

  // Handle annotation deleted
  useEffect(() => {
    const handleAnnotationDeleted = (data: { annotationId: string; userId: string }) => {
      setState(prev => ({
        ...prev,
        annotations: prev.annotations.filter(ann => ann.id !== data.annotationId),
      }));
    };

    on('annotation-deleted', handleAnnotationDeleted);
    return () => off('annotation-deleted', handleAnnotationDeleted);
  }, [on, off]);

  // Handle code highlighted
  useEffect(() => {
    const handleCodeHighlighted = (data: { range: CodeRange; userId: string }) => {
      // This would trigger visual highlighting in the code editor
      console.log('Code highlighted by user:', data.userId, data.range);
    };

    on('code-highlighted', handleCodeHighlighted);
    return () => off('code-highlighted', handleCodeHighlighted);
  }, [on, off]);

  // Handle typing indicator
  useEffect(() => {
    const handleTypingIndicator = (data: { userId: string; isTyping: boolean }) => {
      setState(prev => {
        const newTypingUsers = new Set(prev.typingUsers);
        if (data.isTyping) {
          newTypingUsers.add(data.userId);
        } else {
          newTypingUsers.delete(data.userId);
        }
        return {
          ...prev,
          typingUsers: newTypingUsers,
        };
      });
    };

    on('typing-indicator', handleTypingIndicator);
    return () => off('typing-indicator', handleTypingIndicator);
  }, [on, off]);

  // Handle errors
  useEffect(() => {
    const handleError = (error: { message: string; code: string }) => {
      console.error('Collaboration error:', error);
      if (onError) {
        onError(error);
      }
    };

    on('error', handleError);
    return () => off('error', handleError);
  }, [on, off, onError]);

  // Collaboration actions
  const addAnnotation = useCallback((annotation: {
    lineStart: number;
    lineEnd: number;
    columnStart: number;
    columnEnd: number;
    content: string;
    type: 'comment' | 'suggestion' | 'question';
  }) => {
    if (connected) {
      emit('add-annotation', {
        sessionId,
        annotation,
      });
    }
  }, [connected, emit, sessionId]);

  const updateAnnotation = useCallback((annotationId: string, updates: {
    content?: string;
    type?: 'comment' | 'suggestion' | 'question';
    lineStart?: number;
    lineEnd?: number;
    columnStart?: number;
    columnEnd?: number;
  }) => {
    if (connected) {
      emit('update-annotation', {
        sessionId,
        annotationId,
        updates,
      });
    }
  }, [connected, emit, sessionId]);

  const deleteAnnotation = useCallback((annotationId: string) => {
    if (connected) {
      emit('delete-annotation', {
        sessionId,
        annotationId,
      });
    }
  }, [connected, emit, sessionId]);

  const highlightCode = useCallback((range: CodeRange) => {
    if (connected) {
      emit('highlight-code', { sessionId, range });
    }
  }, [connected, emit, sessionId]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (connected && isTypingRef.current !== isTyping) {
      isTypingRef.current = isTyping;
      emit('typing-indicator', { sessionId, isTyping });

      // Auto-stop typing indicator after 3 seconds of inactivity
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          if (isTypingRef.current) {
            isTypingRef.current = false;
            emit('typing-indicator', { sessionId, isTyping: false });
          }
        }, 3000);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    }
  }, [connected, emit, sessionId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    highlightCode,
    sendTypingIndicator,
  };
};