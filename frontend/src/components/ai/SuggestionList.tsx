'use client';

import React, { useState, useEffect } from 'react';
import { Suggestion } from '@/types';
import SuggestionCard from './SuggestionCard';
import SuggestionFilters from './SuggestionFilters';
import SuggestionSorting from './SuggestionSorting';

interface SuggestionListProps {
  codeSnippetId?: string;
  sessionId?: string;
  onSuggestionSelect?: (suggestion: Suggestion) => void;
}

const SuggestionList: React.FC<SuggestionListProps> = ({
  codeSnippetId,
  sessionId,
  onSuggestionSelect
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: [] as string[],
    severity: [] as string[],
    status: [] as string[],
    type: [] as string[],
    minConfidence: 0,
    maxConfidence: 1
  });
  const [sorting, setSorting] = useState({
    field: 'createdAt' as 'createdAt' | 'confidence' | 'severity' | 'title',
    order: 'desc' as 'asc' | 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (codeSnippetId) queryParams.append('codeSnippetId', codeSnippetId);
      if (sessionId) queryParams.append('sessionId', sessionId);
      
      // Add filters
      if (filters.category.length > 0) queryParams.append('category', filters.category.join(','));
      if (filters.severity.length > 0) queryParams.append('severity', filters.severity.join(','));
      if (filters.status.length > 0) queryParams.append('status', filters.status.join(','));
      if (filters.type.length > 0) queryParams.append('type', filters.type.join(','));
      if (filters.minConfidence > 0) queryParams.append('minConfidence', filters.minConfidence.toString());
      if (filters.maxConfidence < 1) queryParams.append('maxConfidence', filters.maxConfidence.toString());
      
      // Add sorting
      queryParams.append('sortField', sorting.field);
      queryParams.append('sortOrder', sorting.order);
      
      // Add pagination
      queryParams.append('limit', pagination.limit.toString());
      queryParams.append('offset', ((pagination.page - 1) * pagination.limit).toString());

      const response = await fetch(`/api/suggestions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [codeSnippetId, sessionId, filters, sorting, pagination.page]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/suggestions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update suggestion status');
      }

      // Update local state
      setSuggestions(prev => 
        prev.map(suggestion => 
          suggestion.id === id 
            ? { ...suggestion, status: status as any }
            : suggestion
        )
      );
    } catch (err) {
      console.error('Error updating suggestion status:', err);
    }
  };

  const handleFeedback = async (id: string, rating: number, comment?: string) => {
    try {
      const response = await fetch(`/api/suggestions/${id}/feedback`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ rating, comment })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Update local state
      setSuggestions(prev => 
        prev.map(suggestion => 
          suggestion.id === id 
            ? { 
                ...suggestion, 
                userFeedback: { 
                  rating, 
                  comment, 
                  timestamp: new Date() 
                } 
              }
            : suggestion
        )
      );
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleViewDetails = (suggestion: Suggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (newSorting: typeof sorting) => {
    setSorting(newSorting);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchSuggestions}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            AI Suggestions ({pagination.total})
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <SuggestionFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
          />
          <SuggestionSorting
            sorting={sorting}
            onSortingChange={handleSortChange}
          />
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No suggestions found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onStatusChange={handleStatusChange}
                onFeedback={handleFeedback}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 py-4">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SuggestionList;
