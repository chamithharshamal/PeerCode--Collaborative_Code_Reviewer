/**
 * Advanced code selection and highlighting utilities
 */

export interface CodePosition {
  line: number;
  column: number;
}

export interface CodeRange {
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

export interface SelectionInfo {
  range: CodeRange;
  text: string;
  startPosition: CodePosition;
  endPosition: CodePosition;
}

export interface HighlightStyle {
  backgroundColor: string;
  borderColor?: string;
  opacity?: number;
  className?: string;
}

export interface UserHighlight {
  id: string;
  range: CodeRange;
  userId: string;
  color: string;
  timestamp: Date;
  style?: HighlightStyle;
}

export class CodeSelectionManager {
  private selections: Map<string, CodeRange> = new Map();
  private highlights: Map<string, UserHighlight> = new Map();
  private listeners: Set<(selections: CodeRange[], highlights: UserHighlight[]) => void> = new Set();

  /**
   * Add a new selection
   */
  addSelection(id: string, range: CodeRange): void {
    this.selections.set(id, range);
    this.notifyListeners();
  }

  /**
   * Remove a selection
   */
  removeSelection(id: string): void {
    this.selections.delete(id);
    this.notifyListeners();
  }

  /**
   * Update a selection
   */
  updateSelection(id: string, range: CodeRange): void {
    this.selections.set(id, range);
    this.notifyListeners();
  }

  /**
   * Get all selections
   */
  getSelections(): CodeRange[] {
    return Array.from(this.selections.values());
  }

  /**
   * Get a specific selection
   */
  getSelection(id: string): CodeRange | undefined {
    return this.selections.get(id);
  }

  /**
   * Clear all selections
   */
  clearSelections(): void {
    this.selections.clear();
    this.notifyListeners();
  }

  /**
   * Add a user highlight
   */
  addHighlight(highlight: UserHighlight): void {
    this.highlights.set(highlight.id, highlight);
    this.notifyListeners();
  }

  /**
   * Remove a user highlight
   */
  removeHighlight(id: string): void {
    this.highlights.delete(id);
    this.notifyListeners();
  }

  /**
   * Get all highlights
   */
  getHighlights(): UserHighlight[] {
    return Array.from(this.highlights.values());
  }

  /**
   * Get highlights for a specific user
   */
  getUserHighlights(userId: string): UserHighlight[] {
    return Array.from(this.highlights.values()).filter(h => h.userId === userId);
  }

  /**
   * Clear highlights for a specific user
   */
  clearUserHighlights(userId: string): void {
    for (const [id, highlight] of this.highlights.entries()) {
      if (highlight.userId === userId) {
        this.highlights.delete(id);
      }
    }
    this.notifyListeners();
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: (selections: CodeRange[], highlights: UserHighlight[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const selections = this.getSelections();
    const highlights = this.getHighlights();
    this.listeners.forEach(listener => listener(selections, highlights));
  }
}

/**
 * Utility functions for code selection and highlighting
 */
export class CodeSelectionUtils {
  /**
   * Convert DOM selection to code range
   */
  static domSelectionToRange(
    selection: Selection,
    codeElement: HTMLElement,
    lines: string[]
  ): CodeRange | null {
    if (selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!codeElement.contains(range.commonAncestorContainer)) return null;

    const startPosition = this.getPositionInCode(range.startContainer, range.startOffset, codeElement, lines);
    const endPosition = this.getPositionInCode(range.endContainer, range.endOffset, codeElement, lines);

    if (!startPosition || !endPosition) return null;

    return {
      lineStart: Math.min(startPosition.line, endPosition.line),
      lineEnd: Math.max(startPosition.line, endPosition.line),
      columnStart: startPosition.line === endPosition.line 
        ? Math.min(startPosition.column, endPosition.column)
        : startPosition.line < endPosition.line ? startPosition.column : endPosition.column,
      columnEnd: startPosition.line === endPosition.line 
        ? Math.max(startPosition.column, endPosition.column)
        : startPosition.line < endPosition.line ? endPosition.column : startPosition.column,
    };
  }

  /**
   * Get position in code from DOM node and offset
   */
  static getPositionInCode(
    node: Node,
    offset: number,
    codeElement: HTMLElement,
    lines: string[]
  ): CodePosition | null {
    const walker = document.createTreeWalker(
      codeElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentLine = 0;
    let currentColumn = 0;
    let found = false;

    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const textContent = textNode.textContent || '';
      
      if (textNode === node) {
        found = true;
        const textBeforeOffset = textContent.substring(0, offset);
        const newlines = textBeforeOffset.split('\n');
        
        if (newlines.length > 1) {
          currentLine += newlines.length - 1;
          currentColumn = newlines[newlines.length - 1].length;
        } else {
          currentColumn += textBeforeOffset.length;
        }
        break;
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

    return found ? { line: currentLine, column: currentColumn } : null;
  }

  /**
   * Get text content for a range
   */
  static getTextForRange(range: CodeRange, lines: string[]): string {
    if (range.lineStart === range.lineEnd) {
      // Single line selection
      const line = lines[range.lineStart] || '';
      return line.substring(range.columnStart, range.columnEnd);
    } else {
      // Multi-line selection
      const selectedLines = lines.slice(range.lineStart, range.lineEnd + 1);
      if (selectedLines.length === 0) return '';

      const firstLine = selectedLines[0].substring(range.columnStart);
      const lastLine = selectedLines[selectedLines.length - 1].substring(0, range.columnEnd);
      
      if (selectedLines.length === 1) {
        return firstLine;
      }

      const middleLines = selectedLines.slice(1, -1);
      return [firstLine, ...middleLines, lastLine].join('\n');
    }
  }

  /**
   * Check if two ranges overlap
   */
  static rangesOverlap(range1: CodeRange, range2: CodeRange): boolean {
    return !(
      range1.lineEnd < range2.lineStart ||
      range2.lineEnd < range1.lineStart ||
      (range1.lineStart === range2.lineStart && range1.lineEnd === range2.lineEnd && 
       (range1.columnEnd < range2.columnStart || range2.columnEnd < range1.columnStart))
    );
  }

  /**
   * Merge overlapping ranges
   */
  static mergeRanges(ranges: CodeRange[]): CodeRange[] {
    if (ranges.length === 0) return [];

    // Sort ranges by line start, then by column start
    const sorted = [...ranges].sort((a, b) => {
      if (a.lineStart !== b.lineStart) return a.lineStart - b.lineStart;
      return a.columnStart - b.columnStart;
    });

    const merged: CodeRange[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (this.rangesOverlap(current, last)) {
        // Merge ranges
        merged[merged.length - 1] = {
          lineStart: Math.min(last.lineStart, current.lineStart),
          lineEnd: Math.max(last.lineEnd, current.lineEnd),
          columnStart: last.lineStart === current.lineStart 
            ? Math.min(last.columnStart, current.columnStart)
            : last.lineStart < current.lineStart ? last.columnStart : current.columnStart,
          columnEnd: last.lineEnd === current.lineEnd
            ? Math.max(last.columnEnd, current.columnEnd)
            : last.lineEnd < current.lineEnd ? current.columnEnd : last.columnEnd,
        };
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Generate a unique color for a user
   */
  static generateUserColor(userId: string): string {
    const colors = [
      '#ef4444', // red
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#ec4899', // pink
      '#10b981', // emerald
      '#6366f1', // indigo
    ];

    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    return colors[hash % colors.length];
  }

  /**
   * Create a highlight style
   */
  static createHighlightStyle(
    color: string,
    opacity: number = 0.3,
    borderColor?: string
  ): HighlightStyle {
    return {
      backgroundColor: color,
      borderColor: borderColor || color,
      opacity,
      className: `highlight-${color.replace('#', '')}`
    };
  }

  /**
   * Validate a code range
   */
  static validateRange(range: CodeRange, lines: string[]): boolean {
    if (range.lineStart < 0 || range.lineEnd >= lines.length) return false;
    if (range.lineStart > range.lineEnd) return false;
    if (range.columnStart < 0 || range.columnEnd < 0) return false;
    
    const maxColumn = lines[range.lineStart]?.length || 0;
    if (range.columnStart > maxColumn) return false;
    
    if (range.lineStart === range.lineEnd) {
      const maxColumnEnd = lines[range.lineEnd]?.length || 0;
      if (range.columnEnd > maxColumnEnd) return false;
    }

    return true;
  }
}

/**
 * Hook for managing code selections
 */
export function useCodeSelection() {
  const manager = new CodeSelectionManager();

  return {
    addSelection: manager.addSelection.bind(manager),
    removeSelection: manager.removeSelection.bind(manager),
    updateSelection: manager.updateSelection.bind(manager),
    getSelections: manager.getSelections.bind(manager),
    getSelection: manager.getSelection.bind(manager),
    clearSelections: manager.clearSelections.bind(manager),
    addHighlight: manager.addHighlight.bind(manager),
    removeHighlight: manager.removeHighlight.bind(manager),
    getHighlights: manager.getHighlights.bind(manager),
    getUserHighlights: manager.getUserHighlights.bind(manager),
    clearUserHighlights: manager.clearUserHighlights.bind(manager),
    subscribe: manager.subscribe.bind(manager),
  };
}
