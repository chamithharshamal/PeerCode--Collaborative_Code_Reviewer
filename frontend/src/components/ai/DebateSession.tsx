'use client';

import React, { useState, useEffect } from 'react';
import { DebateSession, DebateArgument } from '@/types';
import DebateArgumentCard from './DebateArgumentCard';
import DebateControls from './DebateControls';

interface DebateSessionProps {
  sessionId: string;
  codeSnippetId: string;
  onDebateEnd?: (conclusion: any) => void;
}

const DebateSessionComponent: React.FC<DebateSessionProps> = ({
  sessionId,
  codeSnippetId,
  onDebateEnd
}) => {
  const [debateSession, setDebateSession] = useState<DebateSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newArgument, setNewArgument] = useState('');
  const [argumentType, setArgumentType] = useState<'pro' | 'con' | 'neutral'>('pro');

  useEffect(() => {
    fetchDebateSession();
  }, [sessionId]);

  const fetchDebateSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/debates/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch debate session');
      }

      const sessions = await response.json();
      if (sessions.length > 0) {
        setDebateSession(sessions[0]);
      } else {
        // Create a new debate session
        await createDebateSession();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createDebateSession = async () => {
    try {
      const response = await fetch('/api/debates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          codeSnippetId,
          sessionId,
          topic: 'Code Review Discussion',
          codeContext: 'Code snippet under review',
          participants: [localStorage.getItem('userId')]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create debate session');
      }

      const newSession = await response.json();
      setDebateSession(newSession);

      // Generate initial arguments
      await generateInitialArguments(newSession.id);
    } catch (err) {
      console.error('Error creating debate session:', err);
    }
  };

  const generateInitialArguments = async (debateId: string) => {
    try {
      const response = await fetch(`/api/debates/${debateId}/arguments/initial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          topic: 'Code Review Discussion',
          codeContext: 'Code snippet under review'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate initial arguments');
      }

      const data = await response.json();
      setDebateSession(prev => prev ? {
        ...prev,
        arguments: [...prev.arguments, ...data.arguments]
      } : null);
    } catch (err) {
      console.error('Error generating initial arguments:', err);
    }
  };

  const addUserArgument = async () => {
    if (!debateSession || !newArgument.trim()) return;

    try {
      const response = await fetch(`/api/debates/${debateSession.id}/arguments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newArgument,
          type: argumentType,
          confidence: 0.8,
          evidence: []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add argument');
      }

      const argument = await response.json();
      setDebateSession(prev => prev ? {
        ...prev,
        arguments: [...prev.arguments, argument]
      } : null);

      setNewArgument('');
    } catch (err) {
      console.error('Error adding argument:', err);
    }
  };

  const generateCounterArgument = async (targetArgumentId: string) => {
    if (!debateSession) return;

    try {
      const response = await fetch(`/api/debates/${debateSession.id}/arguments/counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          targetArgumentId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate counter argument');
      }

      const counterArgument = await response.json();
      setDebateSession(prev => prev ? {
        ...prev,
        arguments: [...prev.arguments, counterArgument]
      } : null);
    } catch (err) {
      console.error('Error generating counter argument:', err);
    }
  };

  const concludeDebate = async () => {
    if (!debateSession) return;

    try {
      const response = await fetch(`/api/debates/${debateSession.id}/conclude`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          summary: 'Debate concluded based on discussion',
          recommendation: 'Consider the arguments and make an informed decision',
          confidence: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to conclude debate');
      }

      const concludedSession = await response.json();
      setDebateSession(concludedSession);

      if (onDebateEnd) {
        onDebateEnd(concludedSession.conclusion);
      }
    } catch (err) {
      console.error('Error concluding debate:', err);
    }
  };

  const abandonDebate = async () => {
    if (!debateSession) return;

    try {
      const response = await fetch(`/api/debates/${debateSession.id}/abandon`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to abandon debate');
      }

      const abandonedSession = await response.json();
      setDebateSession(abandonedSession);
    } catch (err) {
      console.error('Error abandoning debate:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchDebateSession}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!debateSession) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No debate session found</p>
        <button
          onClick={createDebateSession}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Start Debate
        </button>
      </div>
    );
  }

  const proArguments = debateSession.arguments.filter(arg => arg.type === 'pro');
  const conArguments = debateSession.arguments.filter(arg => arg.type === 'con');
  const neutralArguments = debateSession.arguments.filter(arg => arg.type === 'neutral');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {debateSession.topic}
          </h2>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              debateSession.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {debateSession.status}
            </span>
          </div>
        </div>

        {debateSession.conclusion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">Conclusion</h3>
            <p className="text-blue-800 text-sm mb-2">{debateSession.conclusion.summary}</p>
            <p className="text-blue-700 text-sm font-medium">
              Recommendation: {debateSession.conclusion.recommendation}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pro Arguments */}
          <div>
            <h3 className="text-lg font-medium text-green-700 mb-3 flex items-center">
              <span className="mr-2">✅</span>
              Pro Arguments ({proArguments.length})
            </h3>
            <div className="space-y-3">
              {proArguments.map((argument) => (
                <DebateArgumentCard
                  key={argument.id}
                  argument={argument}
                  onGenerateCounter={() => generateCounterArgument(argument.id)}
                />
              ))}
            </div>
          </div>

          {/* Con Arguments */}
          <div>
            <h3 className="text-lg font-medium text-red-700 mb-3 flex items-center">
              <span className="mr-2">❌</span>
              Con Arguments ({conArguments.length})
            </h3>
            <div className="space-y-3">
              {conArguments.map((argument) => (
                <DebateArgumentCard
                  key={argument.id}
                  argument={argument}
                  onGenerateCounter={() => generateCounterArgument(argument.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Neutral Arguments */}
        {neutralArguments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700 mb-3 flex items-center">
              <span className="mr-2">⚖️</span>
              Neutral Arguments ({neutralArguments.length})
            </h3>
            <div className="space-y-3">
              {neutralArguments.map((argument) => (
                <DebateArgumentCard
                  key={argument.id}
                  argument={argument}
                  onGenerateCounter={() => generateCounterArgument(argument.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add New Argument */}
        {debateSession.status === 'active' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Add Your Argument</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Argument Type
                </label>
                <select
                  value={argumentType}
                  onChange={(e) => setArgumentType(e.target.value as 'pro' | 'con' | 'neutral')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pro">Pro</option>
                  <option value="con">Con</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Argument
                </label>
                <textarea
                  value={newArgument}
                  onChange={(e) => setNewArgument(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter your argument..."
                />
              </div>
              <button
                onClick={addUserArgument}
                disabled={!newArgument.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Argument
              </button>
            </div>
          </div>
        )}

        {/* Debate Controls */}
        <DebateControls
          status={debateSession.status}
          onConclude={concludeDebate}
          onAbandon={abandonDebate}
        />
      </div>
    </div>
  );
};

export default DebateSessionComponent;
