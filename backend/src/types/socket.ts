import {
  User,
  Annotation,
  CodeRange,
  AISuggestion,
  CodeSnippet,
  CodeChange,
  DebateArguments,
  DebateResponse,
  SessionState,
} from './index';

// Client to Server Events
export interface ClientToServerEvents {
  'join-session': (data: { sessionId: string; userId: string }) => void;
  'add-annotation': (data: { 
    sessionId: string; 
    annotation: {
      lineStart: number;
      lineEnd: number;
      columnStart: number;
      columnEnd: number;
      content: string;
      type: 'comment' | 'suggestion' | 'question';
    }
  }) => void;
  'update-annotation': (data: { 
    sessionId: string; 
    annotationId: string;
    updates: {
      content?: string;
      type?: 'comment' | 'suggestion' | 'question';
      lineStart?: number;
      lineEnd?: number;
      columnStart?: number;
      columnEnd?: number;
    }
  }) => void;
  'delete-annotation': (data: { sessionId: string; annotationId: string }) => void;
  'highlight-code': (data: { sessionId: string; range: CodeRange }) => void;
  'typing-indicator': (data: { sessionId: string; isTyping: boolean }) => void;
  'request-ai-analysis': (data: { sessionId: string; codeSnippet: CodeSnippet }) => void;
  'activate-debate-mode': (data: { sessionId: string; codeChange: CodeChange }) => void;
  'debate-response': (data: { sessionId: string; response: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'session-joined': (data: { participants: User[]; sessionState: SessionState }) => void;
  'user-joined': (data: { user: User; participants: User[] }) => void;
  'user-left': (data: { userId: string; participants: User[] }) => void;
  'annotation-added': (data: { annotation: Annotation; userId: string }) => void;
  'annotation-updated': (data: { annotation: Annotation; userId: string }) => void;
  'annotation-deleted': (data: { annotationId: string; userId: string }) => void;
  'code-highlighted': (data: { range: CodeRange; userId: string }) => void;
  'typing-indicator': (data: { userId: string; isTyping: boolean }) => void;
  'ai-analysis-complete': (data: { suggestions: AISuggestion[] }) => void;
  'debate-arguments': (data: { arguments: DebateArguments }) => void;
  'debate-response': (data: { response: DebateResponse }) => void;
  error: (data: { message: string; code: string }) => void;
}

// Inter-server Events (for scaling)
export interface InterServerEvents {
  ping: () => void;
}

// Socket Data
export interface SocketData {
  userId: string;
  sessionId?: string;
}
