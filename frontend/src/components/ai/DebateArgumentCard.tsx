'use client';

import React, { useState } from 'react';
import { DebateArgument } from '@/types';

interface DebateArgumentCardProps {
  argument: DebateArgument;
  onGenerateCounter: () => void;
}

const DebateArgumentCard: React.FC<DebateArgumentCardProps> = ({
  argument,
  onGenerateCounter
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pro': return 'border-green-200 bg-green-50';
      case 'con': return 'border-red-200 bg-red-50';
      case 'neutral': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pro': return '✅';
      case 'con': return '❌';
      case 'neutral': return '⚖️';
      default: return '💭';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai': return '🤖';
      case 'user': return '👤';
      default: return '💭';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`border rounded-lg p-4 ${getTypeColor(argument.type)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(argument.type)}</span>
          <span className="text-sm font-medium text-gray-700 capitalize">
            {argument.type} Argument
          </span>
          <span className="text-sm">{getSourceIcon(argument.source)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-medium ${getConfidenceColor(argument.confidence)}`}>
            {Math.round(argument.confidence * 100)}% confidence
          </span>
          <span className="text-xs text-gray-500">
            {new Date(argument.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <p className="text-gray-800 text-sm mb-3 leading-relaxed">
        {argument.content}
      </p>

      {argument.evidence && argument.evidence.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showEvidence ? 'Hide' : 'Show'} Evidence ({argument.evidence.length})
          </button>
          {showEvidence && (
            <div className="mt-2 space-y-1">
              {argument.evidence.map((evidence, index) => (
                <div key={index} className="text-xs text-gray-600 bg-white rounded p-2 border">
                  • {evidence}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {argument.source === 'ai' ? 'AI Generated' : 'User Generated'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {argument.source === 'ai' && (
            <button
              onClick={onGenerateCounter}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Generate Counter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebateArgumentCard;
