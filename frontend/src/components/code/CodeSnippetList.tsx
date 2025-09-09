'use client';

import React, { useState, useEffect } from 'react';
import { CodeSnippet } from '../../types';
import CodeViewer from './CodeViewer';

interface CodeSnippetListProps {
  className?: string;
  onSnippetSelect?: (snippet: CodeSnippet) => void;
  selectedSnippetId?: string;
}

interface CodeSnippetListResponse {
  success: boolean;
  data?: {
    snippets: CodeSnippet[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export default function CodeSnippetList({ 
  className = '', 
  onSnippetSelect,
  selectedSnippetId 
}: CodeSnippetListProps) {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const supportedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby',
    'go', 'rust', 'swift', 'kotlin', 'scala', 'bash', 'sql', 'html', 'css', 'json',
    'xml', 'yaml', 'markdown', 'plaintext'
  ];

  const fetchSnippets = async (page = 1, search = '', language = '') => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString(),
      });

      if (search) params.append('search', search);
      if (language) params.append('language', language);

      const response = await fetch(`/api/code-snippets?${params}`);
      const result: CodeSnippetListResponse = await response.json();

      if (result.success && result.data) {
        setSnippets(result.data.snippets);
        setTotal(result.data.total);
        setCurrentPage(page);
      } else {
        setError(result.error || 'Failed to fetch code snippets');
      }
    } catch (err) {
      console.error('Error fetching snippets:', err);
      setError('Network error occurred while fetching snippets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSnippets(1, searchQuery, languageFilter);
  };

  const handleLanguageFilter = (language: string) => {
    setLanguageFilter(language);
    setCurrentPage(1);
    fetchSnippets(1, searchQuery, language);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setLanguageFilter('');
    setCurrentPage(1);
    fetchSnippets();
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

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Code Snippets</h2>
          <div className="text-sm text-gray-500">
            {total} snippet{total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search snippets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={languageFilter}
              onChange={(e) => handleLanguageFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Languages</option>
              {supportedLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={() => fetchSnippets()}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        ) : snippets.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No code snippets found
          </div>
        ) : (
          snippets.map((snippet) => (
            <div
              key={snippet.id}
              className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedSnippetId === snippet.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => onSnippetSelect?.(snippet)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {snippet.filename || 'Untitled'}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {snippet.language}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{formatFileSize(snippet.size)}</span>
                    <span>{snippet.content.split('\n').length} lines</span>
                    <span>Uploaded {formatDate(snippet.uploadedAt)}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded max-h-20 overflow-hidden">
                    {snippet.content.substring(0, 200)}
                    {snippet.content.length > 200 && '...'}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchSnippets(currentPage - 1, searchQuery, languageFilter)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => fetchSnippets(currentPage + 1, searchQuery, languageFilter)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
