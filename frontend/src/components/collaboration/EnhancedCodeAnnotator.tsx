'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Annotation, CodeRange } from '@/types';
import { useAnnotations } from '@/hooks/useAnnotations';
import { AnnotationModal } from './AnnotationModal';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedCodeAnnotatorProps {
  code: string;
  language: string;
  sessionId: string;
  onSelectionChange?: (range: CodeRange | null) => void;
  className?: string;
  readOnly?: boolean;
}

interface AnnotationForm {
  content: string;
  type: 'comment' | 'suggestion' | 'question';
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

export const EnhancedCodeAnnotator: React.FC<EnhancedCodeAnnotatorProps> = ({
  code,
  language,
  sessionId,
  onSelectionChange,
  className = '',
  readOnly = false
}) => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<CodeRange | null>(null);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [annotationForm, setAnnotationForm] = useState<AnnotationForm>({
    content: '',
    type: 'comment',
    lineStart: 0,
    lineEnd: 0,
    columnStart: 0,
    columnEnd: 0
  });
  
  const codeRef = useRef<HTMLPreElement>(null);
  const lines = code.split('\n');

  const {
    annotations,
    loading,
    error,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refreshAnnotations
  } = useAnnotations({
    sessionId,
    userId: user?.id,
    onError: (error) => console.error('Annotation error:', error)
  });

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !codeRef.current) {
      setSelectedRange(null);
      onSelectionChange?.(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const codeElement = codeRef.current;
      
      // Check if selection is within the code element
      if (!codeElement.contains(range.commonAncestorContainer)) {
        return;
      }

      // Calculate line and column positions
      const startPosition = getLineAndColumn(range.startContainer, range.startOffset);
      const endPosition = getLineAndColumn(range.endContainer, range.endOffset);

      if (startPosition && endPosition) {
        const codeRange: CodeRange = {
          lineStart: startPosition.line,
          lineEnd: endPosition.line,
          columnStart: startPosition.column,
          columnEnd: endPosition.column
        };

        setSelectedRange(codeRange);
        onSelectionChange?.(codeRange);
      }
    } catch (error) {
      console.error('Error handling selection:', error);
    }
  }, [readOnly, onSelectionChange]);

  // Convert DOM position to line/column
  const getLineAndColumn = (node: Node, offset: number): { line: number; column: number } | null => {
    if (!codeRef.current) return null;

    const walker = document.createTreeWalker(
      codeRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentLine = 0;
    let currentColumn = 0;

    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const textContent = textNode.textContent || '';
      
      if (textNode === node) {
        // Found the target node
        const textBeforeOffset = textContent.substring(0, offset);
        const newlines = textBeforeOffset.split('\n');
        
        if (newlines.length > 1) {
          currentLine += newlines.length - 1;
          currentColumn = newlines[newlines.length - 1].length;
        } else {
          currentColumn += textBeforeOffset.length;
        }
        
        return { line: currentLine, column: currentColumn };
      }

      // Count newlines in this text node
      const newlines = textContent.split('\n');
      if (newlines.length > 1) {
        currentLine += newlines.length - 1;
        currentColumn = newlines[newlines.length - 1].length;
      } else {
        currentColumn += textContent.length;
      }
    }

    return null;
  };

  // Handle annotation creation
  const handleAddAnnotation = useCallback(() => {
    if (!selectedRange || readOnly) return;

    setAnnotationForm({
      content: '',
      type: 'comment',
      lineStart: selectedRange.lineStart,
      lineEnd: selectedRange.lineEnd,
      columnStart: selectedRange.columnStart,
      columnEnd: selectedRange.columnEnd
    });
    setShowAnnotationForm(true);
  }, [selectedRange, readOnly]);

  const handleSubmitAnnotation = useCallback(async () => {
    if (!annotationForm.content.trim() || readOnly) return;

    const success = await createAnnotation({
      lineStart: annotationForm.lineStart,
      lineEnd: annotationForm.lineEnd,
      columnStart: annotationForm.columnStart,
      columnEnd: annotationForm.columnEnd,
      content: annotationForm.content,
      type: annotationForm.type
    });

    if (success) {
      // Reset form and selection
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
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
      onSelectionChange?.(null);
    }
  }, [annotationForm, createAnnotation, readOnly, onSelectionChange]);

  const handleCancelAnnotation = useCallback(() => {
    setShowAnnotationForm(false);
    setSelectedRange(null);
    window.getSelection()?.removeAllRanges();
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setShowAnnotationModal(true);
  }, []);

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

  // Get annotations for a specific line
  const getLineAnnotations = useCallback((lineNumber: number): Annotation[] => {
    return annotations.filter(
      annotation => lineNumber >= annotation.lineStart && lineNumber <= annotation.lineEnd
    );
  }, [annotations]);

  // Get annotation indicator color
  const getAnnotationColor = useCallback((type: Annotation['type']): string => {
    switch (type) {
      case 'comment':
        return 'bg-blue-500';
      case 'suggestion':
        return 'bg-green-500';
      case 'question':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }, []);

  // Refresh annotations when session changes
  useEffect(() => {
    refreshAnnotations();
  }, [sessionId, refreshAnnotations]);

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
    <div className={`relative ${className}`}>
      {/* Selection toolbar */}
      {selectedRange && !showAnnotationForm && !readOnly && (
        <div className="absolute top-0 right-0 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2">
          <button
            onClick={handleAddAnnotation}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Add Annotation
          </button>
        </div>
      )}

      {/* Annotation form */}
      {showAnnotationForm && !readOnly && (
        <div className="absolute top-0 right-0 z-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 w-80">
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
                onClick={handleCancelAnnotation}
                className="flex-1 px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code display */}
      <div className="relative">
        <pre
          ref={codeRef}
          className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 overflow-x-auto text-sm font-mono"
          onMouseUp={handleMouseUp}
        >
          {lines.map((line, lineIndex) => {
            const lineAnnotations = getLineAnnotations(lineIndex);
            
            return (
              <div key={lineIndex} className="relative group">
                {/* Line number and annotation indicators */}
                <div className="absolute left-0 top-0 w-12 flex items-center justify-between pr-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 select-none">
                    {lineIndex + 1}
                  </span>
                  {lineAnnotations.length > 0 && (
                    <div className="flex gap-1">
                      {lineAnnotations.slice(0, 3).map((annotation, index) => (
                        <button
                          key={annotation.id}
                          onClick={() => handleAnnotationClick(annotation)}
                          className={`w-2 h-2 rounded-full ${getAnnotationColor(annotation.type)} hover:scale-125 transition-transform`}
                          title={`${annotation.type}: ${annotation.content.substring(0, 50)}...`}
                        />
                      ))}
                      {lineAnnotations.length > 3 && (
                        <span className="text-xs text-gray-500">+{lineAnnotations.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Code line */}
                <div className="ml-12 min-h-[1.25rem]">
                  <code className="text-gray-900 dark:text-gray-100">
                    {line || ' '}
                  </code>
                </div>
              </div>
            );
          })}
        </pre>
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
        isReadOnly={readOnly}
      />
    </div>
  );
};
