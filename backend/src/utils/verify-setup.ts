// Verification script to ensure all core interfaces are properly defined
import {
  User,
  Session,
  CodeSnippet,
  Annotation,
  AISuggestion,
  DebateEntry,
  CodeChange,
  CodeRange,
  SessionService,
  AIAnalysisService,
  SessionState,
  SessionUpdate,
  AnalysisResult,
  DebateArguments,
  DebateContext,
  DebateResponse,
  CollaborationUpdate,
} from '../types/index';

import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  ApiResponse,
  ApiError,
} from '../types/api';

import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket';

// Simple verification function
export function verifySetup(): boolean {
  console.log('✅ Core data models imported successfully');
  console.log('✅ Service interfaces imported successfully');
  console.log('✅ API types imported successfully');
  console.log('✅ Socket event types imported successfully');
  
  return true;
}

// Export all types for easy access
export {
  // Core models
  User,
  Session,
  CodeSnippet,
  Annotation,
  AISuggestion,
  DebateEntry,
  CodeChange,
  CodeRange,
  
  // Service interfaces
  SessionService,
  AIAnalysisService,
  
  // State management
  SessionState,
  SessionUpdate,
  CollaborationUpdate,
  
  // AI types
  AnalysisResult,
  DebateArguments,
  DebateContext,
  DebateResponse,
  
  // API types
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  ApiResponse,
  ApiError,
  
  // Socket types
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
};