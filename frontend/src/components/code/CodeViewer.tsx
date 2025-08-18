'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { CodeSnippet } from '../../types';

interface CodeViewerProps {
  codeSnippet: CodeSnippet;
  className?: string;
  height?: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
}

// Map our language names to Monaco editor language IDs
const getMonacoLanguage = (language: string): string => {
  const languageMap: Record<string, string> = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'python': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'csharp',
    'php': 'php',
    'ruby': 'ruby',
    'go': 'go',
    'rust': 'rust',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'scala': 'scala',
    'bash': 'shell',
    'powershell': 'powershell',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'markdown': 'markdown',
    'dockerfile': 'dockerfile',
    'r': 'r',
    'matlab': 'matlab',
    'perl': 'perl',
    'lua': 'lua',
    'dart': 'dart',
    'clojure': 'clojure',
    'elixir': 'elixir',
    'haskell': 'haskell',
    'fsharp': 'fsharp',
    'plaintext': 'plaintext',
  };

  return languageMap[language] || 'plaintext';
};

export default function CodeViewer({
  codeSnippet,
  className = '',
  height = '400px',
  readOnly = true,
  onContentChange,
}: CodeViewerProps) {
  const monacoLanguage = getMonacoLanguage(codeSnippet.language);

  const handleEditorChange = (value: string | undefined) => {
    if (onContentChange && value !== undefined) {
      onContentChange(value);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header with file info */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">
              {codeSnippet.filename || 'Untitled'}
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {codeSnippet.language}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{formatFileSize(codeSnippet.size)}</span>
            <span>Uploaded {formatDate(codeSnippet.uploadedAt)}</span>
          </div>
        </div>
      </div>

      {/* Code editor */}
      <div className="relative">
        <Editor
          height={height}
          language={monacoLanguage}
          value={codeSnippet.content}
          onChange={handleEditorChange}
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            automaticLayout: true,
            wordWrap: 'on',
            theme: 'vs-light',
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }
        />
      </div>

      {/* Footer with additional info */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Lines: {codeSnippet.content.split('\n').length}</span>
          <span>ID: {codeSnippet.id}</span>
        </div>
      </div>
    </div>
  );
}