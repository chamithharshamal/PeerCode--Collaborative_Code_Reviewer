'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useCollaboration } from '../../hooks/useCollaboration';
import { EnhancedConnectionStatus } from './EnhancedConnectionStatus';
import { ParticipantsList } from './ParticipantsList';

interface RealTimeCollaborationDemoProps {
  sessionId: string;
  className?: string;
}

export const RealTimeCollaborationDemo: React.FC<RealTimeCollaborationDemoProps> = ({
  sessionId,
  className = '',
}) => {
  const { connectionStatus, connectionStats } = useSocket();
  const {
    participants,
    sessionState,
    annotations,
    typingUsers,
    isConnected,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    highlightCode,
    sendTypingIndicator,
    leaveSession,
    requestSessionState,
  } = useCollaboration({
    sessionId,
    onError: (error) => {
      console.error('Collaboration error:', error);
    },
  });

  const [newAnnotation, setNewAnnotation] = useState({
    content: '',
    type: 'comment' as 'comment' | 'suggestion' | 'question',
    lineStart: 1,
    lineEnd: 1,
    columnStart: 0,
    columnEnd: 10,
  });

  const [isTyping, setIsTyping] = useState(false);

  // Auto-request session state when connected
  useEffect(() => {
    if (isConnected && sessionId) {
      requestSessionState();
    }
  }, [isConnected, sessionId, requestSessionState]);

  const handleAddAnnotation = () => {
    if (newAnnotation.content.trim()) {
      addAnnotation(newAnnotation);
      setNewAnnotation({
        content: '',
        type: 'comment',
        lineStart: 1,
        lineEnd: 1,
        columnStart: 0,
        columnEnd: 10,
      });
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewAnnotation(prev => ({ ...prev, content: value }));

    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
      sendTypingIndicator(false);
    }
  };

  const handleHighlightCode = () => {
    highlightCode({
      startLine: 1,
      endLine: 5,
      startColumn: 0,
      endColumn: 20,
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Real-time Collaboration</h2>
          <p className="text-sm text-gray-600">Session ID: {sessionId}</p>
        </div>
        <div className="flex items-center space-x-4">
          <EnhancedConnectionStatus showDetails={true} />
          <button
            onClick={leaveSession}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Leave Session
          </button>
        </div>
      </div>

      {/* Connection Stats */}
      {connectionStats.connectionTime && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium capitalize">{connectionStatus}</span>
            </div>
            <div>
              <span className="text-gray-600">Latency:</span>
              <span className="ml-2 font-medium">
                {connectionStats.latency ? `${connectionStats.latency}ms` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Participants:</span>
              <span className="ml-2 font-medium">{participants.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Annotations:</span>
              <span className="ml-2 font-medium">{annotations.length}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participants */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Participants</h3>
          <ParticipantsList participants={participants} />
          
          {/* Typing Indicators */}
          {typingUsers.size > 0 && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </p>
            </div>
          )}
        </div>

        {/* Annotations */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Annotations</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {annotations.length === 0 ? (
              <p className="text-gray-500 text-sm">No annotations yet</p>
            ) : (
              annotations.map((annotation) => (
                <div key={annotation.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">
                      {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Lines {annotation.lineStart}-{annotation.lineEnd}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{annotation.content}</p>
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={() => updateAnnotation(annotation.id, { type: 'suggestion' })}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                      Mark as Suggestion
                    </button>
                    <button
                      onClick={() => deleteAnnotation(annotation.id)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Annotation Form */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Add Annotation</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={newAnnotation.type}
                onChange={(e) => setNewAnnotation(prev => ({ 
                  ...prev, 
                  type: e.target.value as 'comment' | 'suggestion' | 'question' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="comment">Comment</option>
                <option value="suggestion">Suggestion</option>
                <option value="question">Question</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Line Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={newAnnotation.lineStart}
                  onChange={(e) => setNewAnnotation(prev => ({ 
                    ...prev, 
                    lineStart: parseInt(e.target.value) || 1 
                  }))}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Start"
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="number"
                  value={newAnnotation.lineEnd}
                  onChange={(e) => setNewAnnotation(prev => ({ 
                    ...prev, 
                    lineEnd: parseInt(e.target.value) || 1 
                  }))}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="End"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={newAnnotation.content}
              onChange={handleTyping}
              placeholder="Enter your annotation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleAddAnnotation}
              disabled={!isConnected || !newAnnotation.content.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Annotation
            </button>
            <button
              onClick={handleHighlightCode}
              disabled={!isConnected}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Highlight Code
            </button>
            <button
              onClick={requestSessionState}
              disabled={!isConnected}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
