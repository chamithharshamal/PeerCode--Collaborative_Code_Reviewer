'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedCodeAnnotator } from './EnhancedCodeAnnotator';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/hooks/useSocket';

interface RealTimeCollaborationDemoProps {
  className?: string;
}

const SAMPLE_CODE = `// Sample React Component for Code Review
import React, { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserListProps {
  users: User[];
  onUserSelect: (user: User) => void;
  selectedUserId?: string;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  onUserSelect,
  selectedUserId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  // Handle user selection
  const handleUserClick = useCallback((user: User) => {
    onUserSelect(user);
  }, [onUserSelect]);

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  return (
    <div className="user-list">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      
      <div className="users-container">
        {filteredUsers.map(user => (
          <div
            key={user.id}
            className={\`user-item \${selectedUserId === user.id ? 'selected' : ''}\`}
            onClick={() => handleUserClick(user)}
          >
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.name}
                className="user-avatar"
              />
            )}
            <div className="user-info">
              <h3 className="user-name">{user.name}</h3>
              <p className="user-email">{user.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};`;

export const RealTimeCollaborationDemo: React.FC<RealTimeCollaborationDemoProps> = ({
  className = ''
}) => {
  const { user, isAuthenticated } = useAuth();
  const [sessionId] = useState('demo-session-123');
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language] = useState('typescript');
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null);
  const [selectedAISuggestion, setSelectedAISuggestion] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const { connected, emit, on, off } = useSocket({
    autoConnect: true
  });                     

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    // Emit code change to other participants
    emit('code-change', {
      sessionId,
      code: newCode,
      userId: user?.id,
      timestamp: new Date()
    });
  }, [emit, sessionId, user?.id]);

  // Handle annotation selection
  const handleAnnotationSelect = useCallback((annotation: any) => {
    setSelectedAnnotation(annotation);
    console.log('Selected annotation:', annotation);
  }, []);

  // Handle AI suggestion selection
  const handleAISuggestionSelect = useCallback((suggestion: any) => {
    setSelectedAISuggestion(suggestion);
    console.log('Selected AI suggestion:', suggestion);
  }, []);

  // Handle real-time updates
  useEffect(() => {
    if (!connected) return;

    const handleCodeChange = (data: any) => {
      if (data.userId !== user?.id) {
        setCode(data.code);
      }
    };

    const handleUserJoined = (data: any) => {
      console.log('User joined:', data);
    };

    const handleUserLeft = (data: any) => {
      console.log('User left:', data);
    };

    on('code-change', handleCodeChange);
    on('user-joined', handleUserJoined);
    on('user-left', handleUserLeft);

    return () => {
      off('code-change', handleCodeChange);
      off('user-joined', handleUserJoined);
      off('user-left', handleUserLeft);
    };
  }, [connected, on, off, user?.id]);

  // Join session on mount
  useEffect(() => {
    if (connected && user) {
      emit('join-session', {
        sessionId,
        userId: user.id,
        username: user.username
      });
    }
  }, [connected, user, emit, sessionId]);

  if (!isAuthenticated) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to access the collaborative code review demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Real-time Collaborative Code Review
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Collaborate with team members in real-time using annotations and AI analysis
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Session: {sessionId}
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Welcome to Collaborative Code Review!
            </h2>
            
            <div className="space-y-4 text-gray-600 dark:text-gray-400">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Features:
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Select code and add annotations (comments, suggestions, questions)</li>
                  <li>Real-time collaboration with other users</li>
                  <li>AI-powered code analysis and suggestions</li>
                  <li>Search and filter annotations</li>
                  <li>Multi-user highlighting and focus</li>
                  <li>Keyboard shortcuts (Ctrl+F to search, Ctrl+G for next result)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  How to use:
                </h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Select any code by clicking and dragging</li>
                  <li>Click "Add Annotation" to create a comment, suggestion, or question</li>
                  <li>Use "AI Analysis" to get automated code suggestions</li>
                  <li>Click on annotation indicators to view and edit annotations</li>
                  <li>Use the search bar to find specific annotations</li>
                </ol>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowWelcome(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <EnhancedCodeAnnotator
          sessionId={sessionId}
          code={code}
          language={language}
          onCodeChange={handleCodeChange}
          onAnnotationSelect={handleAnnotationSelect}
          onAISuggestionSelect={handleAISuggestionSelect}
          className="h-full"
        />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>Language: {language}</span>
            <span>Lines: {code.split('\n').length}</span>
            <span>Characters: {code.length}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {selectedAnnotation && (
              <span>Selected: {selectedAnnotation.type} annotation</span>
            )}
            {selectedAISuggestion && (
              <span>AI Suggestion: {selectedAISuggestion.title}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};