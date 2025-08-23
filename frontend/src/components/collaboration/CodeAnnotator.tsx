'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Annotation, CodeRange } from '@/types';

interface CodeAnnotatorProps {
  code: string;
  language: string;
  annotations: Annotation[];
  onAddAnnotation: (annotation: {
    lineStart: number;
    lineEnd: number;
    columnStart: number;
    columnEnd: number;
    content: string;
    type: 'comment' | 'suggestion' | 'question';
  }) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  onSelectionChange?: (range: CodeRange | null) => void;
  className?: string;
}

interface AnnotationForm {
  content: string;
  type: 'comment' | 'suggestion' | 'question';
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

export const CodeAnnotator: React.FC<CodeAnnotatorProps> = ({
  code,
  language,
  annotations,
  onAddAnnotation,
  onAnnotationClick,
  onSelectionChange,
  className = ''
}) => {
  const [selectedRange, setSelectedRange] = useState<CodeRange | null>(null);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
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

  // Handle text selection
  const handleMouseUp = () => {
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
  };

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
    let totalOffset = 0;

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
      
      totalOffset += textContent.length;
    }

    return null;
  };

  // Handle annotation creation
  const handleAddAnnotation = () => {
    if (!selectedRange) return;

    setAnnotationForm({
      content: '',
      type: 'comment',
      lineStart: selectedRange.lineStart,
      lineEnd: selectedRange.lineEnd,
      columnStart: selectedRange.columnStart,
      columnEnd: selectedRange.columnEnd
    });
    setShowAnnotationForm(true);
  };

  const handleSubmitAnnotation = () => {
    if (!annotationForm.content.trim()) return;

    onAddAnnotation({
      lineStart: annotationForm.lineStart,
      lineEnd: annotationForm.lineEnd,
      columnStart: annotationForm.columnStart,
      columnEnd: annotationForm.columnEnd,
      content: annotationForm.content,
      type: annotationForm.type
    });

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
  };

  const handleCancelAnnotation = () => {
    setShowAnnotationForm(false);
    setSelectedRange(null);
    window.getSelection()?.removeAllRanges();
    onSelectionChange?.(null);
  };

  // Get annotations for a specific line
  const getLineAnnotations = (lineNumber: number): Annotation[] => {
    return annotations.filter(
      annotation => lineNumber >= annotation.lineStart && lineNumber <= annotation.lineEnd
    );
  };

  // Get annotation indicator color
  const getAnnotationColor = (type: Annotation['type']): string => {
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
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selection toolbar */}
      {selectedRange && !showAnnotationForm && (
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
      {showAnnotationForm && (
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
                          onClick={() => onAnnotationClick?.(annotation)}
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
    </div>
  );
};