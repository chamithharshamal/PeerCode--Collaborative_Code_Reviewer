'use client';

import React, { useState } from 'react';
import { Suggestion } from '@/types';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: string) => void;
  onFeedback: (id: string, rating: number, comment?: string) => void;
  onViewDetails: (suggestion: Suggestion) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onStatusChange,
  onFeedback,
  onViewDetails
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return '⚡';
      case 'security': return '🔒';
      case 'maintainability': return '🔧';
      case 'style': return '🎨';
      case 'bugs': return '🐛';
      default: return '💡';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'implemented': return 'text-blue-600 bg-blue-50';
      case 'dismissed': return 'text-gray-600 bg-gray-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const handleFeedbackSubmit = () => {
    if (rating > 0) {
      onFeedback(suggestion.id, rating, comment);
      setShowFeedback(false);
      setRating(0);
      setComment('');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getCategoryIcon(suggestion.category)}</span>
          <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(suggestion.severity)}`}>
            {suggestion.severity}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(suggestion.status)}`}>
            {suggestion.status}
          </span>
        </div>
      </div>

      <p className="text-gray-700 text-sm mb-3 line-clamp-2">{suggestion.description}</p>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center space-x-4">
          <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
          {suggestion.lineNumber && (
            <span>Line {suggestion.lineNumber}</span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {suggestion.tags.map((tag, index) => (
            <span key={index} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {suggestion.codeExample && (
        <div className="bg-gray-50 rounded p-3 mb-3">
          <pre className="text-xs text-gray-800 overflow-x-auto">
            <code>{suggestion.codeExample}</code>
          </pre>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(suggestion)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details
          </button>
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            {showFeedback ? 'Cancel' : 'Rate'}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {suggestion.status === 'pending' && (
            <>
              <button
                onClick={() => onStatusChange(suggestion.id, 'accepted')}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Accept
              </button>
              <button
                onClick={() => onStatusChange(suggestion.id, 'rejected')}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Reject
              </button>
            </>
          )}
          {suggestion.status === 'accepted' && (
            <button
              onClick={() => onStatusChange(suggestion.id, 'implemented')}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Mark Implemented
            </button>
          )}
        </div>
      </div>

      {showFeedback && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (1-5)
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Add your feedback..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFeedback(false)}
                className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={rating === 0}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionCard;
