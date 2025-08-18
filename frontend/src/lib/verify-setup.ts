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
  CodeReviewInterface,
  CollaborationManager,
  CollaborationUpdate,
  SessionState,
} from '@/types';

import {
  ApiResponse,
  ApiError,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
} from '@/types/api';

// Simple verification function
export function verifySetup(): boolean {
  console.log('✅ Core data models imported successfully');
  console.log('✅ Frontend-specific interfaces imported successfully');
  console.log('✅ API types imported successfully');
  
  return true;
}

// Export all types for easy access
export type {
  // Core models
  User,
  Session,
  CodeSnippet,
  Annotation,
  AISuggestion,
  DebateEntry,
  CodeChange,
  CodeRange,
  
  // Frontend interfaces
  CodeReviewInterface,
  CollaborationManager,
  CollaborationUpdate,
  SessionState,
  
  // API types
  ApiResponse,
  ApiError,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
};