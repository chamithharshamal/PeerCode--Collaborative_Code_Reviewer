'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { User, Annotation, CodeRange, SessionState } from '@/types';

interface CollaborationContextType {
  participants: User[];
  sessionState: SessionState | null;
  annotations: Annotation[];
  typingUsers: Set<string>;
  isConnected: boolean;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'userId' | 'sessionId' | 'createdAt'>) => void;
  highlightCode: (range: CodeRange) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

interface CollaborationProviderProps {
  children: ReactNode;
  sessionId: string;
  onError?: (error: { message: string; code: string }) => void;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  children,
  sessionId,
  onError,
}) => {
  const collaboration = useCollaboration({ sessionId, onError });

  return (
    <CollaborationContext.Provider value={collaboration}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaborationContext = (): CollaborationContextType => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaborationContext must be used within a CollaborationProvider');
  }
  return context;
};