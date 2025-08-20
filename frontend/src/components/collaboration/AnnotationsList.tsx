'use client';

import React, { useState } from 'react';
import { useCollaborationContext } from './CollaborationProvider';
import { Annotation } from '@/types';

interface AnnotationsListProps {
  className?: string;
  onAnnotationClick?: (annotation: Annotation) => void;
}

const AnnotationItem: React.FC<{
  annotation: Annotation;
  onClick?: () => void;
}> = ({ annotation, onClick }) => {
  const getTypeColor = (type: Annotation['type']) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'suggestion':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'question':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div
      className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
        onClick ? 'hover:shadow-sm' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
            annotation.type
          )}`}
        >
          {annotation.type}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Line {annotation.lineStart}
          {annotation.lineStart !== annotation.lineEnd && `-${annotation.lineEnd}`}
        </span>
      </div>
      
      <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
        {annotation.content}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>By User {annotation.userId.slice(0, 8)}...</span>
        <span>{formatTime(annotation.createdAt)}</span>
      </div>
    </div>
  );
};

export const AnnotationsList: React.FC<AnnotationsListProps> = ({
  className = '',
  onAnnotationClick,
}) => {
  const { annotations, isConnected } = useCollaborationContext();
  const [filter, setFilter] = useState<'all' | 'comment' | 'suggestion' | 'question'>('all');

  const filteredAnnotations = annotations.filter(
    (annotation) => filter === 'all' || annotation.type === filter
  );

  const sortedAnnotations = [...filteredAnnotations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!isConnected) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
          <p className="text-sm">Loading annotations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Annotations ({annotations.length})
        </h3>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All</option>
          <option value="comment">Comments</option>
          <option value="suggestion">Suggestions</option>
          <option value="question">Questions</option>
        </select>
      </div>

      {sortedAnnotations.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            {filter === 'all' ? 'No annotations yet' : `No ${filter}s yet`}
          </p>
          <p className="text-xs mt-1">
            Click on code lines to add annotations
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedAnnotations.map((annotation) => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              onClick={() => onAnnotationClick?.(annotation)}
            />
          ))}
        </div>
      )}
    </div>
  );
};