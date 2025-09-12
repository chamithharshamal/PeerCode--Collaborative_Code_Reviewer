'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Annotation } from '@/types';
import { useAnnotations } from '@/hooks/useAnnotations';
import { AnnotationModal } from './AnnotationModal';
import { useAuth } from '@/lib/auth-context';

interface AnnotationManagerProps {
  sessionId: string;
  className?: string;
  onAnnotationSelect?: (annotation: Annotation) => void;
}

type FilterType = 'all' | 'comment' | 'suggestion' | 'question';
type SortBy = 'created' | 'updated' | 'type' | 'line';

export const AnnotationManager: React.FC<AnnotationManagerProps> = ({
  sessionId,
  className = '',
  onAnnotationSelect
}) => {
  const { user } = useAuth();
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    annotations,
    loading,
    error,
    updateAnnotation,
    deleteAnnotation,
    clearAllAnnotations,
    refreshAnnotations
  } = useAnnotations({
    sessionId,
    userId: user?.id,
    onError: (error) => console.error('Annotation error:', error)
  });

  // Filter and sort annotations
  const filteredAndSortedAnnotations = useMemo(() => {
    let filtered = annotations;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(annotation => annotation.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(annotation =>
        annotation.content.toLowerCase().includes(query) ||
        annotation.type.toLowerCase().includes(query)
      );
    }

    // Sort annotations
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        case 'line':
          return a.lineStart - b.lineStart;
        default:
          return 0;
      }
    });

    return filtered;
  }, [annotations, filterType, searchQuery, sortBy]);

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setShowAnnotationModal(true);
    onAnnotationSelect?.(annotation);
  }, [onAnnotationSelect]);

  // Handle annotation update
  const handleAnnotationUpdate = useCallback(async (
    id: string,
    updates: { content?: string; type?: 'comment' | 'suggestion' | 'question' }
  ) => {
    const success = await updateAnnotation(id, updates);
    if (success) {
      setShowAnnotationModal(false);
      setSelectedAnnotation(null);
    }
  }, [updateAnnotation]);

  // Handle annotation delete
  const handleAnnotationDelete = useCallback(async (id: string) => {
    const success = await deleteAnnotation(id);
    if (success) {
      setShowAnnotationModal(false);
      setSelectedAnnotation(null);
    }
  }, [deleteAnnotation]);

  // Handle clear all annotations
  const handleClearAll = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all annotations? This action cannot be undone.')) {
      await clearAllAnnotations();
    }
  }, [clearAllAnnotations]);

  // Get type color
  const getTypeColor = useCallback((type: Annotation['type']) => {
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
  }, []);

  // Format date
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }, []);

  // Get annotation preview
  const getAnnotationPreview = useCallback((content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-gray-500">Loading annotations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-red-500">Error loading annotations: {error}</div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Annotations ({annotations.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={refreshAnnotations}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Refresh
            </button>
            {annotations.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="space-y-3">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Types</option>
                <option value="comment">Comments</option>
                <option value="suggestion">Suggestions</option>
                <option value="question">Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="created">Created Date</option>
                <option value="updated">Updated Date</option>
                <option value="type">Type</option>
                <option value="line">Line Number</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Annotations List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAndSortedAnnotations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {annotations.length === 0 ? 'No annotations yet' : 'No annotations match your filters'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                onClick={() => handleAnnotationClick(annotation)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                          annotation.type
                        )}`}
                      >
                        {annotation.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Lines {annotation.lineStart + 1}-{annotation.lineEnd + 1}
                      </span>
                      {annotation.userId === user?.id && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          (Yours)
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                      {getAnnotationPreview(annotation.content)}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Created: {formatDate(annotation.createdAt)}</span>
                      {annotation.updatedAt && annotation.updatedAt !== annotation.createdAt && (
                        <span>Updated: {formatDate(annotation.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Annotation Modal */}
      <AnnotationModal
        annotation={selectedAnnotation}
        isOpen={showAnnotationModal}
        onClose={() => {
          setShowAnnotationModal(false);
          setSelectedAnnotation(null);
        }}
        onUpdate={handleAnnotationUpdate}
        onDelete={handleAnnotationDelete}
        currentUserId={user?.id}
        isReadOnly={false}
      />
    </div>
  );
};
