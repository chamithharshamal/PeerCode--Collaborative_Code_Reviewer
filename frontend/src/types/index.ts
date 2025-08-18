// Re-export all types from backend for consistency
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface Session {
  id: string;
  creatorId: string;
  codeSnippet: CodeSnippet;
  participants: string[];
  annotations: Annotation[];
  aiSuggestions: AISuggestion[];
  debateHistory: DebateEntry[];
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeSnippet {
  id: string;
  content: string;
  language: string;
  filename?: string;
  size: number;
  uploadedAt: Date;
}

export interface Annotation {
  id: string;
  userId: string;
  sessionId: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  content: string;
  type: 'comment' | 'suggestion' | 'question';
  createdAt: Date;
}

export interface AISuggestion {
  id: string;
  sessionId: string;
  type: 'bug' | 'optimization' | 'style';
  severity: 'low' | 'medium' | 'high';
  lineStart: number;
  lineEnd: number;
  title: string;
  description: string;
  suggestedFix?: string;
  confidence: number;
  createdAt: Date;
}

export interface DebateEntry {
  id: string;
  sessionId: string;
  type: 'ai-argument' | 'ai-counter' | 'user-response';
  content: string;
  relatedCodeChange: CodeChange;
  timestamp: Date;
}

export interface CodeChange {
  id: string;
  lineStart: number;
  lineEnd: number;
  originalCode: string;
  proposedCode: string;
  reason: string;
}

export interface CodeRange {
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

// Frontend-specific interfaces
export interface CodeReviewInterface {
  sessionId: string;
  codeContent: string;
  annotations: Annotation[];
  participants: User[];
  aiSuggestions: AISuggestion[];
  debateMode: boolean;
}

export interface CollaborationManager {
  joinSession(sessionId: string): Promise<void>;
  addAnnotation(annotation: Annotation): void;
  highlightCode(range: CodeRange): void;
  sendTypingIndicator(isTyping: boolean): void;
  subscribeToUpdates(callback: (update: CollaborationUpdate) => void): void;
}

export interface CollaborationUpdate {
  type: 'annotation' | 'highlight' | 'typing' | 'ai-suggestion' | 'debate';
  data: unknown;
  userId: string;
  timestamp: Date;
}

export interface SessionState {
  session: Session;
  activeParticipants: User[];
  currentAnnotations: Annotation[];
  aiSuggestions: AISuggestion[];
  debateMode: boolean;
}