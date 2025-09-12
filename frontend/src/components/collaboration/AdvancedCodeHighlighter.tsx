'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CodeRange, Annotation } from '@/types';
import { CodeSelectionManager, CodeSelectionUtils, UserHighlight, HighlightStyle } from '@/lib/codeSelection';

interface AdvancedCodeHighlighterProps {
  code: string;
  language: string;
  annotations: Annotation[];
  selectedRange?: CodeRange | null;
  highlightedRanges?: Array<{ range: CodeRange; userId: string; color: string }>;
  onSelectionChange?: (range: CodeRange | null) => void;
  onLineClick?: (lineNumber: number) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  onUserHighlight?: (highlight: UserHighlight) => void;
  className?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  enableMultiSelection?: boolean;
  enableColumnSelection?: boolean;
  enableUserHighlights?: boolean;
  currentUserId?: string;
}

interface LineHighlight {
  lineNumber: number;
  type: 'annotation' | 'selection' | 'user-highlight' | 'focused' | 'search' | 'multi-selection';
  color: string;
  opacity?: number;
  userId?: string;
  style?: HighlightStyle;
}

interface SelectionState {
  isSelecting: boolean;
  startPosition: { line: number; column: number } | null;
  endPosition: { line: number; column: number } | null;
  selections: CodeRange[];
  activeSelectionId: string | null;
}

export const AdvancedCodeHighlighter: React.FC<AdvancedCodeHighlighterProps> = ({
  code,
  language,
  annotations,
  selectedRange,
  highlightedRanges = [],
  onSelectionChange,
  onLineClick,
  onAnnotationClick,
  onUserHighlight,
  className = '',
  readOnly = false,
  showLineNumbers = true,
  enableMultiSelection = false,
  enableColumnSelection = true,
  enableUserHighlights = true,
  currentUserId
}) => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isSelecting: false,
    startPosition: null,
    endPosition: null,
    selections: [],
    activeSelectionId: null
  });

  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState({ x: 0, y: 0 });

  const codeRef = useRef<HTMLPreElement>(null);
  const selectionManagerRef = useRef<CodeSelectionManager>(new CodeSelectionManager());
  const lines = code.split('\n');

  // Calculate line height and character width
  const lineHeight = 20;
  const charWidth = 8;

  // Handle mouse down for selection start
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (readOnly) return;

    const position = getPositionFromEvent(event);
    if (position) {
      const selectionId = `selection-${Date.now()}`;
      setSelectionState({
        isSelecting: true,
        startPosition: position,
        endPosition: position,
        selections: enableMultiSelection ? selectionState.selections : [],
        activeSelectionId: selectionId
      });
      
      // Clear any existing selection
      window.getSelection()?.removeAllRanges();
    }
  }, [readOnly, enableMultiSelection, selectionState.selections]);

  // Handle mouse move for selection
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!selectionState.isSelecting || !selectionState.startPosition || readOnly) return;

    const position = getPositionFromEvent(event);
    if (position) {
      setSelectionState(prev => ({
        ...prev,
        endPosition: position
      }));
    }
  }, [selectionState.isSelecting, selectionState.startPosition, readOnly]);

  // Handle mouse up for selection end
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!selectionState.isSelecting || !selectionState.startPosition || readOnly) return;

    const position = getPositionFromEvent(event);
    if (position) {
      const range: CodeRange = {
        lineStart: Math.min(selectionState.startPosition.line, position.line),
        lineEnd: Math.max(selectionState.startPosition.line, position.line),
        columnStart: selectionState.startPosition.line === position.line 
          ? Math.min(selectionState.startPosition.column, position.column)
          : selectionState.startPosition.line < position.line ? selectionState.startPosition.column : position.column,
        columnEnd: selectionState.startPosition.line === position.line 
          ? Math.max(selectionState.startPosition.column, position.column)
          : selectionState.startPosition.line < position.line ? position.column : selectionState.startPosition.column,
      };

      // Validate range
      if (!CodeSelectionUtils.validateRange(range, lines)) {
        setSelectionState(prev => ({
          ...prev,
          isSelecting: false,
          startPosition: null,
          endPosition: null,
          activeSelectionId: null
        }));
        return;
      }

      const newSelections = enableMultiSelection 
        ? [...selectionState.selections, range]
        : [range];

      setSelectionState({
        isSelecting: false,
        startPosition: null,
        endPosition: null,
        selections: newSelections,
        activeSelectionId: null
      });

      // Show selection toolbar
      if (enableUserHighlights && currentUserId) {
        const rect = codeRef.current?.getBoundingClientRect();
        if (rect) {
          setSelectionToolbarPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
          setShowSelectionToolbar(true);
        }
      }

      onSelectionChange?.(range);
    }
  }, [selectionState, readOnly, enableMultiSelection, enableUserHighlights, currentUserId, lines, onSelectionChange]);

  // Handle line click
  const handleLineClick = useCallback((lineNumber: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setFocusedLine(lineNumber);
    onLineClick?.(lineNumber);
  }, [onLineClick]);

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: Annotation, event: React.MouseEvent) => {
    event.stopPropagation();
    onAnnotationClick?.(annotation);
  }, [onAnnotationClick]);

  // Handle user highlight creation
  const handleCreateHighlight = useCallback((color: string) => {
    if (!currentUserId || selectionState.selections.length === 0) return;

    const range = selectionState.selections[selectionState.selections.length - 1];
    const highlight: UserHighlight = {
      id: `highlight-${Date.now()}`,
      range,
      userId: currentUserId,
      color,
      timestamp: new Date(),
      style: CodeSelectionUtils.createHighlightStyle(color, 0.3)
    };

    selectionManagerRef.current.addHighlight(highlight);
    onUserHighlight?.(highlight);
    setShowSelectionToolbar(false);
  }, [currentUserId, selectionState.selections, onUserHighlight]);

  // Get position from mouse event
  const getPositionFromEvent = useCallback((event: React.MouseEvent): { line: number; column: number } | null => {
    if (!codeRef.current) return null;

    const rect = codeRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate line number
    const lineNumber = Math.floor(y / lineHeight);

    if (lineNumber < 0 || lineNumber >= lines.length) {
      return null;
    }

    // Calculate column
    const column = Math.floor(x / charWidth);
    const maxColumn = lines[lineNumber]?.length || 0;

    return {
      line: lineNumber,
      column: Math.max(0, Math.min(column, maxColumn))
    };
  }, [lines, lineHeight, charWidth]);

  // Get line highlights
  const getLineHighlights = useCallback((): LineHighlight[] => {
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
    highlightedRanges.forEach(({ range, userId, color }) => {
      for (let line = range.lineStart; line <= range.lineEnd; line++) {
        highlights.push({
          lineNumber: line,
          type: 'user-highlight',
          color,
          opacity: 0.3,
          userId
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

    // Add multi-selection highlights
    selectionState.selections.forEach((range, index) => {
      for (let line = range.lineStart; line <= range.lineEnd; line++) {
        highlights.push({
          lineNumber: line,
          type: 'multi-selection',
          color: '#8b5cf6', // Purple
          opacity: 0.15
        });
      }
    });

    // Add active selection highlight (while selecting)
    if (selectionState.isSelecting && selectionState.startPosition && selectionState.endPosition) {
      const startLine = Math.min(selectionState.startPosition.line, selectionState.endPosition.line);
      const endLine = Math.max(selectionState.startPosition.line, selectionState.endPosition.line);
      
      for (let line = startLine; line <= endLine; line++) {
        highlights.push({
          lineNumber: line,
          type: 'selection',
          color: '#3b82f6',
          opacity: 0.1
        });
      }
    }

    // Add focused line highlight
    if (focusedLine !== null) {
      highlights.push({
        lineNumber: focusedLine,
        type: 'focused',
        color: '#fbbf24', // Yellow
        opacity: 0.3
      });
    }

    // Add search result highlights
    searchResults.forEach(lineNumber => {
      highlights.push({
        lineNumber,
        type: 'search',
        color: '#f59e0b', // Orange
        opacity: lineNumber === searchResults[currentSearchIndex] ? 0.4 : 0.2
      });
    });

    return highlights;
  }, [annotations, highlightedRanges, selectedRange, selectionState, focusedLine, searchResults, currentSearchIndex]);

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

  // Get annotations for a specific line
  const getLineAnnotations = useCallback((lineNumber: number): Annotation[] => {
    return annotations.filter(
      annotation => lineNumber >= annotation.lineStart && lineNumber <= annotation.lineEnd
    );
  }, [annotations]);

  // Search functionality
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: number[] = [];
    const searchQuery = query.toLowerCase();

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchQuery)) {
        results.push(index);
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [lines]);

  // Handle search input
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    performSearch(query);
  }, [performSearch]);

  // Navigate search results
  const navigateSearch = useCallback((direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    setCurrentSearchIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % searchResults.length;
      } else {
        return prev === 0 ? searchResults.length - 1 : prev - 1;
      }
    });
  }, [searchResults.length]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f':
            event.preventDefault();
            // Focus search input
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            searchInput?.focus();
            break;
          case 'g':
            event.preventDefault();
            if (searchResults.length > 0) {
              navigateSearch('next');
            }
            break;
          case 'Shift':
            if (event.key === 'g' && searchResults.length > 0) {
              event.preventDefault();
              navigateSearch('prev');
            }
            break;
          case 'Escape':
            clearSearch();
            setFocusedLine(null);
            setShowSelectionToolbar(false);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigateSearch, clearSearch, searchResults.length]);

  // Close selection toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const toolbar = document.querySelector('.selection-toolbar');
      if (toolbar && !toolbar.contains(event.target as Node)) {
        setShowSelectionToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lineHighlights = getLineHighlights();

  return (
    <div className={`relative ${className}`}>
      {/* Search Bar */}
      <div className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search in code..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 w-48"
          />
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentSearchIndex + 1}/{searchResults.length}
              </span>
              <button
                onClick={() => navigateSearch('prev')}
                className="px-1 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                ↑
              </button>
              <button
                onClick={() => navigateSearch('next')}
                className="px-1 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                ↓
              </button>
            </div>
          )}
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="px-1 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Selection Toolbar */}
      {showSelectionToolbar && enableUserHighlights && (
        <div
          className="selection-toolbar absolute z-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2"
          style={{
            left: selectionToolbarPosition.x,
            top: selectionToolbarPosition.y
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Highlight:</span>
            {['#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'].map(color => (
              <button
                key={color}
                onClick={() => handleCreateHighlight(color)}
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={`Highlight with ${color}`}
              />
            ))}
            <button
              onClick={() => setShowSelectionToolbar(false)}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Code Display */}
      <pre
        ref={codeRef}
        className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg overflow-x-auto text-sm font-mono select-none h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'none' }}
      >
        {lines.map((line, lineIndex) => {
          const lineAnnotations = getLineAnnotations(lineIndex);
          const lineHighlight = lineHighlights.find(h => h.lineNumber === lineIndex);
          const isSearchResult = searchResults.includes(lineIndex);
          const isCurrentSearchResult = searchResults[currentSearchIndex] === lineIndex;
          
          return (
            <div
              key={lineIndex}
              className="relative group min-h-[20px] leading-5"
              style={{
                backgroundColor: lineHighlight 
                  ? `${lineHighlight.color}${Math.round((lineHighlight.opacity || 0.2) * 255).toString(16).padStart(2, '0')}`
                  : 'transparent'
              }}
              onMouseEnter={() => setHoveredLine(lineIndex)}
              onMouseLeave={() => setHoveredLine(null)}
            >
              {/* Line number and gutter */}
              {showLineNumbers && (
                <div className="absolute left-0 top-0 w-16 h-full flex items-center justify-between px-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600">
                  <span 
                    className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none"
                    onClick={(e) => handleLineClick(lineIndex, e)}
                  >
                    {lineIndex + 1}
                  </span>
                  
                  {/* Annotation indicators */}
                  {lineAnnotations.length > 0 && (
                    <div className="flex gap-1">
                      {lineAnnotations.slice(0, 3).map((annotation, index) => (
                        <button
                          key={annotation.id}
                          onClick={(e) => handleAnnotationClick(annotation, e)}
                          className="w-2 h-2 rounded-full hover:scale-125 transition-transform"
                          style={{ backgroundColor: getAnnotationColor(annotation.type) }}
                          title={`${annotation.type}: ${annotation.content.substring(0, 50)}...`}
                        />
                      ))}
                      {lineAnnotations.length > 3 && (
                        <span className="text-xs text-gray-500">+{lineAnnotations.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Search result indicator */}
                  {isSearchResult && (
                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  )}
                </div>
              )}
              
              {/* Code content */}
              <div className={`${showLineNumbers ? 'ml-16' : 'ml-4'} px-4 py-0`}>
                <code className="text-gray-900 dark:text-gray-100">
                  {line || ' '}
                </code>
              </div>

              {/* Hover overlay for line actions */}
              {!readOnly && hoveredLine === lineIndex && (
                <div className="absolute right-2 top-0 h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleLineClick(lineIndex, e)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Annotate
                  </button>
                </div>
              )}

              {/* Current search result highlight */}
              {isCurrentSearchResult && (
                <div className="absolute inset-0 border-2 border-orange-500 rounded pointer-events-none" />
              )}
            </div>
          );
        })}
      </pre>

      {/* Selection info */}
      {selectedRange && (
        <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-400 shadow-sm">
          Lines {selectedRange.lineStart + 1}-{selectedRange.lineEnd + 1} selected
        </div>
      )}

      {/* Multi-selection info */}
      {enableMultiSelection && selectionState.selections.length > 1 && (
        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-400 shadow-sm">
          {selectionState.selections.length} selections
        </div>
      )}
    </div>
  );
};
