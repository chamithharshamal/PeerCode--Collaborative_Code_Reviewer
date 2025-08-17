import { User, Session, CodeSnippet, AISuggestion } from './index';

// Authentication API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Session API
export interface CreateSessionRequest {
  codeSnippet: {
    content: string;
    language: string;
    filename?: string;
  };
}

export interface CreateSessionResponse {
  session: Session;
  joinUrl: string;
}

export interface JoinSessionRequest {
  sessionId: string;
}

export interface JoinSessionResponse {
  session: Session;
  participants: User[];
}

// Code Upload API
export interface UploadCodeRequest {
  content: string;
  language: string;
  filename?: string;
}

export interface UploadCodeResponse {
  codeSnippet: CodeSnippet;
}

// AI Analysis API
export interface AnalyzeCodeRequest {
  codeSnippetId: string;
}

export interface AnalyzeCodeResponse {
  suggestions: AISuggestion[];
  analysisId: string;
}

// Generic API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

// Error Response
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
