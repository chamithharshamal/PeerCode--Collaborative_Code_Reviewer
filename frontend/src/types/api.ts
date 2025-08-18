import { User, Session } from './index';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

// Authentication
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

// Session Management
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