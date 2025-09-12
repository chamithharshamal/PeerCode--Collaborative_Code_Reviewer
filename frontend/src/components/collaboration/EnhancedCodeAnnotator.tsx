'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Annotation, CodeRange, AISuggestion } from '@/types';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/lib/auth-context';
import { AdvancedCodeHighlighter } from './AdvancedCodeHighlighter';
import { AnnotationManager } from './AnnotationManager';
import { AnnotationModal } from './AnnotationModal';
import { AIAnalysisPanel } from './AIAnalysisPanel';

interface EnhancedCodeAnnotatorProps {
  sessionId: string;
  code: string;
  language: string;
  className?: string;
  onCodeChange?: (newCode: string) => void;
  onAnnotationSelect?: (annotation: Annotation) => void;
  onAISuggestionSelect?: (suggestion: AISuggestion) => void;
}

interface AnnotationForm {
  content: string;
  type: 'comment' | 'suggestion' | 'question';
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

interface UserHighlight {
  range: CodeRange;
  userId: string;
  color: string;
  timestamp: Date;
}

export const EnhancedCodeAnnotator: React.FC<EnhancedCodeAnnotatorProps> = ({
  sessionId,
  code,
  language,
  className = '',
  onCodeChange,
  onAnnotationSelect,
  onAISuggestionSelect
}) => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<CodeRange | null>(null);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [userHighlights, setUserHighlights] = useState<UserHighlight[]>([]);
  const [focusedAnnotation, setFocusedAnnotation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'comment' | 'suggestion' | 'question'>('all');
  const [showAnnotationManager, setShowAnnotationManager] = useState(false);

  const annotationFormRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  const {
    annotations,
    loading: annotationsLoading,
    error: annotationsError,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refreshAnnotations,
    clearAllAnnotations
  } = useAnnotations({
    sessionId,
    userId: user?.id,
    onError: (error) => console.error('Annotation error:', error)
  });

  const { connected, emit, on, off } = useSocket({
    autoConnect: true
  });

  const [annotationForm, setAnnotationForm] = useState<AnnotationForm>({
    content: '',
    type: 'comment',
    lineStart: 0,
    lineEnd: 0,
    columnStart: 0,
    columnEnd: 0
  });

  // Filter annotations based on search and type
  const filteredAnnotations = useMemo(() => {
    let filtered = annotations;

    if (filterType !== 'all') {
      filtered = filtered.filter(annotation => annotation.type === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(annotation =>
        annotation.content.toLowerCase().includes(query) ||
        annotation.type.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [annotations, filterType, searchQuery]);

  // Handle text selection
  const handleSelectionChange = useCallback((range: CodeRange | null) => {
    setSelectedRange(range);
    if (range) {
      setAnnotationForm(prev => ({
        ...prev,
        lineStart: range.lineStart,
        lineEnd: range.lineEnd,
        columnStart: range.columnStart,
        columnEnd: range.columnEnd
      }));
    }
  }, []);

  // Handle annotation creation
  const handleAddAnnotation = useCallback(() => {
    if (!selectedRange) return;
    setShowAnnotationForm(true);
  }, [selectedRange]);

  // Handle annotation submission
  const handleSubmitAnnotation = useCallback(async () => {
    if (!annotationForm.content.trim() || !user) return;

    const success = await createAnnotation({
      lineStart: annotationForm.lineStart,
      lineEnd: annotationForm.lineEnd,
      columnStart: annotationForm.columnStart,
      columnEnd: annotationForm.columnEnd,
      content: annotationForm.content,
      type: annotationForm.type
    });

    if (success) {
      setShowAnnotationForm(false);
      setSelectedRange(null);
      setAnnotationForm({
        content: '',
        type: 'comment',
        lineStart: 0,
        lineEnd: 0,
        columnStart: 0,
        columnEnd: 0
      });
      window.getSelection()?.removeAllRanges();
    }
  }, [annotationForm, createAnnotation, user]);

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setShowAnnotationModal(true);
    setFocusedAnnotation(annotation.id);
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
      setFocusedAnnotation(null);
    }
  }, [updateAnnotation]);

  // Handle annotation delete
  const handleAnnotationDelete = useCallback(async (id: string) => {
    const success = await deleteAnnotation(id);
    if (success) {
      setShowAnnotationModal(false);
      setSelectedAnnotation(null);
      setFocusedAnnotation(null);
    }
  }, [deleteAnnotation]);

  // Handle AI analysis
  const handleAIAnalysis = useCallback(() => {
    setShowAIAnalysis(true);
  }, []);

  // Handle user highlights from WebSocket
  useEffect(() => {
    if (!connected) return;

    const handleUserHighlight = (data: { range: CodeRange; userId: string; color: string }) => {
      setUserHighlights(prev => [
        ...prev.filter(h => h.userId !== data.userId), // Remove existing highlights from this user
        {
          range: data.range,
          userId: data.userId,
          color: data.color,
          timestamp: new Date()
        }
      ]);
    };

    const handleAnnotationFocus = (data: { annotationId: string; userId: string }) => {
      setFocusedAnnotation(data.annotationId);
    };

    on('user-highlight', handleUserHighlight);
    on('annotation-focus', handleAnnotationFocus);

    return () => {
      off('user-highlight', handleUserHighlight);
      off('annotation-focus', handleAnnotationFocus);
    };
  }, [connected, on, off]);

  // Handle annotation focus
  const handleFocusAnnotation = useCallback((annotationId: string) => {
    setFocusedAnnotation(annotationId);
    emit('annotation-focus', { annotationId, userId: user?.id });
  }, [emit, user?.id]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((type: 'all' | 'comment' | 'suggestion' | 'question') => {
    setFilterType(type);
  }, []);

  // Get annotation color
  const getAnnotationColor = useCallback((type: Annotation['type']): string => {
    switch (type) {
      case 'comment':
        return '#3b82f6'; // Blue
      case 'suggestion':
        return '#10b981'; // Green
      case 'question':
        return '#f59e0b'; // Yellow
      default:
        return '#6b7280'; // Gray
    }
  }, []);

  // Get user highlight color
  const getUserHighlightColor = useCallback((userId: string): string => {
    const colors = ['#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  }, []);

  // Convert user highlights to the format expected by CodeHighlighter
  const highlightedRanges = useMemo(() => {
    return userHighlights.map(highlight => ({
      range: highlight.range,
      userId: highlight.userId,
      color: highlight.color
    }));
  }, [userHighlights]);

  // Close annotation form when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (annotationFormRef.current && !annotationFormRef.current.contains(event.target as Node)) {
        setShowAnnotationForm(false);
        setSelectedRange(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main Code Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Code Review
            </h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value as typeof filterType)}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Types</option>
              <option value="comment">Comments</option>
              <option value="suggestion">Suggestions</option>
              <option value="question">Questions</option>
            </select>

            {/* AI Analysis */}
            <button
              onClick={handleAIAnalysis}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              AI Analysis
            </button>

            {/* Annotation Manager */}
            <button
              onClick={() => setShowAnnotationManager(!showAnnotationManager)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {showAnnotationManager ? 'Hide' : 'Show'} Annotations ({annotations.length})
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="flex-1 relative">
          <AdvancedCodeHighlighter
            code={code}
            language={language}
            annotations={filteredAnnotations}
            selectedRange={selectedRange}
            highlightedRanges={highlightedRanges}
            onSelectionChange={handleSelectionChange}
            onLineClick={(lineNumber) => {
              // Handle line click for focusing
              console.log('Line clicked:', lineNumber);
            }}
            onUserHighlight={(highlight) => {
              // Handle user highlight creation
              console.log('User highlight created:', highlight);
            }}
            className="h-full"
            readOnly={false}
            enableMultiSelection={true}
            enableUserHighlights={true}
            currentUserId={user?.id}
          />

          {/* Selection Toolbar */}
          {selectedRange && !showAnnotationForm && (
            <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2">
              <button
                onClick={handleAddAnnotation}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Add Annotation
              </button>
            </div>
          )}

          {/* Annotation Form */}
          {showAnnotationForm && (
            <div
              ref={annotationFormRef}
              className="absolute top-4 right-4 z-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 w-80"
            >
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Add Annotation (Lines {annotationForm.lineStart + 1}-{annotationForm.lineEnd + 1})
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={annotationForm.type}
                    onChange={(e) => setAnnotationForm(prev => ({ 
                      ...prev, 
                      type: e.target.value as 'comment' | 'suggestion' | 'question' 
                    }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="comment">Comment</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="question">Question</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content
                  </label>
                  <textarea
                    value={annotationForm.content}
                    onChange={(e) => setAnnotationForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your annotation..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                    rows={3}
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitAnnotation}
                    disabled={!annotationForm.content.trim()}
                    className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAnnotationForm(false);
                      setSelectedRange(null);
                      window.getSelection()?.removeAllRanges();
                    }}
                    className="flex-1 px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Panels */}
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* Annotation Manager */}
        {showAnnotationManager && (
          <div className="flex-1">
            <AnnotationManager
              sessionId={sessionId}
              className="h-full"
              onAnnotationSelect={handleAnnotationClick}
            />
          </div>
        )}

        {/* AI Analysis Panel */}
        {showAIAnalysis && (
          <div className="flex-1">
            <AIAnalysisPanel
              sessionId={sessionId}
              code={code}
              language={language}
              className="h-full"
              onSuggestionSelect={onAISuggestionSelect}
              onClose={() => setShowAIAnalysis(false)}
            />
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
          setFocusedAnnotation(null);
        }}
        onUpdate={handleAnnotationUpdate}
        onDelete={handleAnnotationDelete}
        currentUserId={user?.id}
        isReadOnly={false}
      />
    </div>
  );
};