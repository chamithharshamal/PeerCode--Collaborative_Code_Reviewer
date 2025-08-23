'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CodeRange, Annotation } from '@/types';

interface CodeHighlighterProps {
  code: string;
  language: string;
  annotations: Annotation[];
  selectedRange?: CodeRange | null;
  highlightedRanges?: Array<{ range: CodeRange; userId: string; color: string }>;
  onSelectionChange?: (range: CodeRange | null) => void;
  onLineClick?: (lineNumber: number) => void;
  className?: string;
  readOnly?: boolean;
}

interface LineHighlight {
  lineNumber: number;
  type: 'annotation' | 'selection' | 'user-highlight';
  color: string;
  opacity?: number;
}

export const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  code,
  language,
  annotations,
  selectedRange,
  highlightedRanges = [],
  onSelectionChange,
  onLineClick,
  className = '',
  readOnly = false
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ line: number; column: number } | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const lines = code.split('\n');

  // Handle mouse down for selection start
  const handleMouseDown = (event: React.MouseEvent) => {
    if (readOnly) return;

    const position = getPositionFromEvent(event);
    if (position) {
      setIsSelecting(true);
      setSelectionStart(position);
      setSelectionEnd(position);
      
      // Clear any existing selection
      window.getSelection()?.removeAllRanges();
    }
  };

  // Handle mouse move for selection
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || readOnly) return;

    const position = getPositionFromEvent(event);
    if (position) {
      setSelectionEnd(position);
    }
  };

  // Handle mouse up for selection end
  const handleMouseUp = (event: React.MouseEvent) => {
    if (!isSelecting || !selectionStart || readOnly) return;

    const position = getPositionFromEvent(event);
    if (position) {
      const range: CodeRange = {
        lineStart: Math.min(selectionStart.line, position.line),
        lineEnd: Math.max(selectionStart.line, position.line),
        columnStart: selectionStart.line === position.line 
          ? Math.min(selectionStart.column, position.column)
          : selectionStart.line < position.line ? selectionStart.column : position.column,
        columnEnd: selectionStart.line === position.line 
          ? Math.max(selectionStart.column, position.column)
          : selectionStart.line < position.line ? position.column : selectionStart.column,
      };

      onSelectionChange?.(range);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // State for current selection end
  const [selectionEnd, setSelectionEnd] = useState<{ line: number; column: number } | null>(null);

  // Get position from mouse event
  const getPositionFromEvent = (event: React.MouseEvent): { line: number; column: number } | null => {
    if (!codeRef.current) return null;

    const rect = codeRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Estimate line number based on line height
    const lineHeight = 20; // Approximate line height in pixels
    const lineNumber = Math.floor(y / lineHeight);

    if (lineNumber < 0 || lineNumber >= lines.length) {
      return null;
    }

    // Estimate column based on character width
    const charWidth = 8; // Approximate character width in pixels for monospace font
    const column = Math.floor(x / charWidth);

    return {
      line: lineNumber,
      column: Math.max(0, Math.min(column, lines[lineNumber]?.length || 0))
    };
  };

  // Get line highlights
  const getLineHighlights = (): LineHighlight[] => {
    const highlights: LineHighlight[] = [];

    // Add annotation highlights
    annotations.forEach(annotation => {
      for (let line = annotation.lineStart; line <= annotation.lineEnd; line++) {
        highlights.push({
          lineNumber: line,
          type: 'annotation',
          color: getAnnotationColor(annotation.type),
          opacity: 0.2
        });
      }
    });

    // Add user highlights
    highlightedRanges.forEach(({ range, color }) => {
      for (let line = range.lineStart; line <= range.lineEnd; line++) {
        highlights.push({
          lineNumber: line,
          type: 'user-highlight',
          color,
          opacity: 0.3
        });
      }
    });

    // Add current selection highlight
    if (selectedRange) {
      for (let line = selectedRange.lineStart; line <= selectedRange.lineEnd; line++) {
        highlights.push({
          lineNumber: line,
          type: 'selection',
          color: '#3b82f6', // Blue
          opacity: 0.2
        });
      }
    }

    // Add active selection highlight (while selecting)
    if (isSelecting && selectionStart && selectionEnd) {
      const startLine = Math.min(selectionStart.line, selectionEnd.line);
      const endLine = Math.max(selectionStart.line, selectionEnd.line);
      
      for (let line = startLine; line <= endLine; line++) {
        highlights.push({
          lineNumber: line,
          type: 'selection',
          color: '#3b82f6',
          opacity: 0.1
        });
      }
    }

    return highlights;
  };

  // Get annotation color
  const getAnnotationColor = (type: Annotation['type']): string => {
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
  };

  // Get annotations for a specific line
  const getLineAnnotations = (lineNumber: number): Annotation[] => {
    return annotations.filter(
      annotation => lineNumber >= annotation.lineStart && lineNumber <= annotation.lineEnd
    );
  };

  // Handle line click
  const handleLineClick = (lineNumber: number) => {
    onLineClick?.(lineNumber);
  };

  const lineHighlights = getLineHighlights();

  return (
    <div className={`relative ${className}`}>
      <pre
        ref={codeRef}
        className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg overflow-x-auto text-sm font-mono select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'none' }}
      >
        {lines.map((line, lineIndex) => {
          const lineAnnotations = getLineAnnotations(lineIndex);
          const lineHighlight = lineHighlights.find(h => h.lineNumber === lineIndex);
          
          return (
            <div
              key={lineIndex}
              className="relative group min-h-[20px] leading-5"
              style={{
                backgroundColor: lineHighlight 
                  ? `${lineHighlight.color}${Math.round((lineHighlight.opacity || 0.2) * 255).toString(16).padStart(2, '0')}`
                  : 'transparent'
              }}
            >
              {/* Line number and gutter */}
              <div className="absolute left-0 top-0 w-16 h-full flex items-center justify-between px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600">
                <span 
                  className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => handleLineClick(lineIndex)}
                >
                  {lineIndex + 1}
                </span>
                
                {/* Annotation indicators */}
                {lineAnnotations.length > 0 && (
                  <div className="flex gap-1">
                    {lineAnnotations.slice(0, 3).map((annotation, index) => (
                      <div
                        key={annotation.id}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getAnnotationColor(annotation.type) }}
                        title={`${annotation.type}: ${annotation.content.substring(0, 50)}...`}
                      />
                    ))}
                    {lineAnnotations.length > 3 && (
                      <span className="text-xs text-gray-500">+{lineAnnotations.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Code content */}
              <div className="ml-16 px-4 py-0">
                <code className="text-gray-900 dark:text-gray-100">
                  {line || ' '}
                </code>
              </div>

              {/* Hover overlay for line actions */}
              {!readOnly && (
                <div className="absolute right-2 top-0 h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleLineClick(lineIndex)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Annotate
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </pre>

      {/* Selection info */}
      {selectedRange && (
        <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-400 shadow-sm">
          Lines {selectedRange.lineStart + 1}-{selectedRange.lineEnd + 1} selected
        </div>
      )}
    </div>
  );
};