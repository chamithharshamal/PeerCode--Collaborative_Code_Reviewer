// Core Data Models
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
  participants: string[]; // User IDs
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
  confidence: number; // 0-1
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

// Service Interfaces
export interface SessionService {
  createSession(userId: string, codeSnippet: CodeSnippet): Promise<Session>;
  joinSession(sessionId: string, userId: string): Promise<void>;
  leaveSession(sessionId: string, userId: string): Promise<void>;
  getSessionState(sessionId: string): Promise<SessionState>;
  updateSessionState(sessionId: string, update: SessionUpdate): Promise<void>;
}

export interface AIAnalysisService {
  analyzeCode(codeSnippet: CodeSnippet): Promise<AnalysisResult>;
  generateSuggestions(analysis: AnalysisResult): Promise<AISuggestion[]>;
  simulateDebate(codeChange: CodeChange): Promise<DebateArguments>;
  continueDebate(context: DebateContext, userInput: string): Promise<DebateResponse>;
}

// Supporting Types
export interface SessionState {
  session: Session;
  activeParticipants: User[];
  currentAnnotations: Annotation[];
  aiSuggestions: AISuggestion[];
  debateMode: boolean;
}

export interface SessionUpdate {
  annotations?: Annotation[];
  aiSuggestions?: AISuggestion[];
  debateHistory?: DebateEntry[];
  status?: Session['status'];
}

export interface AnalysisResult {
  codeSnippetId: string;
  language: string;
  issues: CodeIssue[];
  metrics: CodeMetrics;
  suggestions: string[];
}

export interface CodeIssue {
  type: 'bug' | 'optimization' | 'style';
  severity: 'low' | 'medium' | 'high';
  line: number;
  column: number;
  message: string;
  suggestedFix?: string;
}

export interface CodeMetrics {
  complexity: number;
  maintainability: number;
  readability: number;
}

export interface DebateArguments {
  arguments: string[];
  counterArguments: string[];
  context: DebateContext;
}

export interface DebateContext {
  codeChange: CodeChange;
  previousArguments: string[];
  userResponses: string[];
}

export interface DebateResponse {
  response: string;
  followUpQuestions: string[];
  context: DebateContext;
}

export interface CollaborationUpdate {
  type: 'annotation' | 'highlight' | 'typing' | 'ai-suggestion' | 'debate';
  data: unknown;
  userId: string;
  timestamp: Date;
}
