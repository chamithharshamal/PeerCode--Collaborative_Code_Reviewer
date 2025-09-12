'use client';

import React, { useState, useCallback } from 'react';
import { EnhancedCodeAnnotator } from '@/components/collaboration/EnhancedCodeAnnotator';
import { AnnotationManager } from '@/components/collaboration/AnnotationManager';
import { RealTimeCollaborationDemo } from '@/components/collaboration/RealTimeCollaborationDemo';
import SuggestionList from '@/components/ai/SuggestionList';
import DebateSessionComponent from '@/components/ai/DebateSession';
import { CodeRange, Suggestion, DebateSession } from '@/types';
import { useAuth } from '@/lib/auth-context';

const SAMPLE_CODE = `// Sample React component for demonstration
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface UserListProps {
  users: User[];
  onUserSelect: (user: User) => void;
  onUserDelete: (userId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  onUserSelect,
  onUserDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const handleDelete = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      onUserDelete(userId);
    }
  };

  return (
    <div className="user-list">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="users-grid">
        {filteredUsers.map(user => (
          <div key={user.id} className="user-card">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <span className={\`role-badge \${user.role}\`}>
              {user.role}
            </span>
            <div className="user-actions">
              <button onClick={() => onUserSelect(user)}>
                Edit
              </button>
              <button 
                onClick={() => handleDelete(user.id)}
                className="delete-btn"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};`;

export default function CollaborativeReviewPage() {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<CodeRange | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'annotations' | 'collaboration' | 'suggestions' | 'debate'>('code');
  const [sessionId] = useState('demo-session-123'); // In real app, this would come from URL params
  const [codeSnippetId] = useState('demo-code-snippet-123'); // In real app, this would come from URL params

  const handleSelectionChange = useCallback((range: CodeRange | null) => {
    setSelectedRange(range);
  }, []);

  const handleAnnotationSelect = useCallback((annotation: any) => {
    setSelectedAnnotation(annotation);
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
  }, []);

  const handleDebateEnd = useCallback((conclusion: any) => {
    console.log('Debate concluded:', conclusion);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to access the collaborative code review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Collaborative Code Review
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time collaborative code annotation and review system
          </p>
        </div>

        {/* Session Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Session: {sessionId}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connected as: {user.email}
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedRange && (
                <span>
                  Selected: Lines {selectedRange.lineStart + 1}-{selectedRange.lineEnd + 1}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('code')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'code'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Code Editor
            </button>
            <button
              onClick={() => setActiveTab('annotations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'annotations'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Annotations
            </button>
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'collaboration'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Collaboration
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suggestions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              AI Suggestions
            </button>
            <button
              onClick={() => setActiveTab('debate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'debate'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              AI Debate
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {activeTab === 'code' && (
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Code Editor with Annotations
                </h3>
                <EnhancedCodeAnnotator
                  code={SAMPLE_CODE}
                  language="typescript"
                  sessionId={sessionId}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'annotations' && (
            <div className="lg:col-span-2">
              <AnnotationManager
                sessionId={sessionId}
                onAnnotationSelect={handleAnnotationSelect}
                className="w-full"
              />
            </div>
          )}

          {activeTab === 'collaboration' && (
            <div className="lg:col-span-2">
              <RealTimeCollaborationDemo
                className="w-full h-96"
              />
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="lg:col-span-2">
              <SuggestionList
                codeSnippetId={codeSnippetId}
                sessionId={sessionId}
                onSuggestionSelect={handleSuggestionSelect}
              />
            </div>
          )}

          {activeTab === 'debate' && (
            <div className="lg:col-span-2">
              <DebateSessionComponent
                sessionId={sessionId}
                codeSnippetId={codeSnippetId}
                onDebateEnd={handleDebateEnd}
              />
            </div>
          )}

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Selection Info */}
              {selectedRange && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Current Selection
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Lines: {selectedRange.lineStart + 1} - {selectedRange.lineEnd + 1}</p>
                    <p>Columns: {selectedRange.columnStart + 1} - {selectedRange.columnEnd + 1}</p>
                  </div>
                </div>
              )}

              {/* Selected Annotation Info */}
              {selectedAnnotation && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Selected Annotation
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Type:</strong> {selectedAnnotation.type}</p>
                    <p><strong>Lines:</strong> {selectedAnnotation.lineStart + 1} - {selectedAnnotation.lineEnd + 1}</p>
                    <p><strong>Content:</strong> {selectedAnnotation.content.substring(0, 100)}...</p>
                  </div>
                </div>
              )}

              {/* Selected Suggestion Info */}
              {selectedSuggestion && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Selected Suggestion
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p><strong>Title:</strong> {selectedSuggestion.title}</p>
                    <p><strong>Type:</strong> {selectedSuggestion.type}</p>
                    <p><strong>Category:</strong> {selectedSuggestion.category}</p>
                    <p><strong>Severity:</strong> {selectedSuggestion.severity}</p>
                    <p><strong>Confidence:</strong> {Math.round(selectedSuggestion.confidence * 100)}%</p>
                    <p><strong>Status:</strong> {selectedSuggestion.status}</p>
                    <p><strong>Description:</strong> {selectedSuggestion.description.substring(0, 150)}...</p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How to Use
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>• Select text in the code editor to add annotations</p>
                  <p>• Click on annotation indicators to view details</p>
                  <p>• Use the Annotations tab to manage all annotations</p>
                  <p>• Real-time collaboration updates automatically</p>
                  <p>• Check AI Suggestions for automated code analysis</p>
                  <p>• Use AI Debate to explore different perspectives</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
