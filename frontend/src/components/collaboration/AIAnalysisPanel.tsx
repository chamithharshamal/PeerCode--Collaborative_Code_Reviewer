'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AISuggestion } from '@/types';

interface AIAnalysisPanelProps {
  sessionId: string;
  code: string;
  language: string;
  className?: string;
  onSuggestionSelect?: (suggestion: AISuggestion) => void;
  onClose?: () => void;
}

interface AnalysisResult {
  suggestions: AISuggestion[];
  loading: boolean;
  error: string | null;
  lastAnalyzed: Date | null;
}

interface AnalysisConfig {
  includeSecurity: boolean;
  includePerformance: boolean;
  includeStyle: boolean;
  includeBugs: boolean;
  confidenceThreshold: number;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  sessionId,
  code,
  language,
  className = '',
  onSuggestionSelect,
  onClose
}) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    suggestions: [],
    loading: false,
    error: null,
    lastAnalyzed: null
  });

  const [config, setConfig] = useState<AnalysisConfig>({
    includeSecurity: true,
    includePerformance: true,
    includeStyle: true,
    includeBugs: true,
    confidenceThreshold: 0.5
  });

  const [showConfig, setShowConfig] = useState(false);

  // Analyze code with AI
  const analyzeCode = useCallback(async () => {
    setAnalysisResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/ai-analysis/analyze-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          sessionId,
          config: {
            includeSecurity: config.includeSecurity,
            includePerformance: config.includePerformance,
            includeStyle: config.includeStyle,
            includeBugs: config.includeBugs,
            confidenceThreshold: config.confidenceThreshold
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setAnalysisResult({
          suggestions: data.data.suggestions || [],
          loading: false,
          error: null,
          lastAnalyzed: new Date()
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      setAnalysisResult(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }));
    }
  }, [code, language, sessionId, config]);

  // Get suggestion color based on severity
  const getSeverityColor = useCallback((severity: AISuggestion['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }, []);

  // Get type color
  const getTypeColor = useCallback((type: AISuggestion['type']) => {
    switch (type) {
      case 'bug':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'optimization':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'style':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }, []);

  // Format confidence as percentage
  const formatConfidence = useCallback((confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: AISuggestion) => {
    onSuggestionSelect?.(suggestion);
  }, [onSuggestionSelect]);

  // Filter suggestions based on config
  const filteredSuggestions = analysisResult.suggestions.filter(suggestion => {
    if (suggestion.confidence < config.confidenceThreshold) return false;
    
    switch (suggestion.type) {
      case 'bug':
        return config.includeBugs;
      case 'optimization':
        return config.includePerformance;
      case 'style':
        return config.includeStyle;
      default:
        return true;
    }
  });

  // Group suggestions by type
  const groupedSuggestions = filteredSuggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, AISuggestion[]>);

  return (
    <div className={`bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AI Analysis
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Config
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Analysis Controls */}
        <div className="space-y-3">
          <button
            onClick={analyzeCode}
            disabled={analysisResult.loading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {analysisResult.loading ? 'Analyzing...' : 'Analyze Code'}
          </button>

          {analysisResult.lastAnalyzed && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last analyzed: {analysisResult.lastAnalyzed.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Analysis Configuration
            </h4>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeBugs}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeBugs: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include Bug Detection</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includePerformance}
                  onChange={(e) => setConfig(prev => ({ ...prev, includePerformance: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include Performance Analysis</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeStyle}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeStyle: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include Style Analysis</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeSecurity}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeSecurity: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include Security Analysis</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confidence Threshold: {formatConfidence(config.confidenceThreshold)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.confidenceThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {analysisResult.loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Analyzing code...</p>
          </div>
        )}

        {analysisResult.error && (
          <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">
              Error: {analysisResult.error}
            </p>
            <button
              onClick={analyzeCode}
              className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!analysisResult.loading && !analysisResult.error && filteredSuggestions.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {analysisResult.suggestions.length === 0 
              ? 'Click "Analyze Code" to get AI suggestions'
              : 'No suggestions match your current filters'
            }
          </div>
        )}

        {!analysisResult.loading && !analysisResult.error && filteredSuggestions.length > 0 && (
          <div className="p-4 space-y-4">
            {Object.entries(groupedSuggestions).map(([type, suggestions]) => (
              <div key={type} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {type} ({suggestions.length})
                </h4>
                
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {suggestion.title}
                        </h5>
                        <div className="flex gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                              suggestion.severity
                            )}`}
                          >
                            {suggestion.severity}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                              suggestion.type
                            )}`}
                          >
                            {suggestion.type}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {suggestion.description}
                      </p>
                      
                      {suggestion.suggestedFix && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Suggested Fix:
                          </p>
                          <code className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                            {suggestion.suggestedFix}
                          </code>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Lines {suggestion.lineStart + 1}-{suggestion.lineEnd + 1}</span>
                        <span>Confidence: {formatConfidence(suggestion.confidence)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
