'use client';

import React, { useState } from 'react';

interface SuggestionFiltersProps {
  filters: {
    category: string[];
    severity: string[];
    status: string[];
    type: string[];
    minConfidence: number;
    maxConfidence: number;
  };
  onFiltersChange: (filters: typeof filters) => void;
}

const SuggestionFilters: React.FC<SuggestionFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: 'performance', label: 'Performance', icon: '⚡' },
    { value: 'security', label: 'Security', icon: '🔒' },
    { value: 'maintainability', label: 'Maintainability', icon: '🔧' },
    { value: 'style', label: 'Style', icon: '🎨' },
    { value: 'bugs', label: 'Bugs', icon: '🐛' }
  ];

  const severities = [
    { value: 'high', label: 'High', color: 'text-red-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'low', label: 'Low', color: 'text-green-600' }
  ];

  const statuses = [
    { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
    { value: 'accepted', label: 'Accepted', color: 'text-green-600' },
    { value: 'rejected', label: 'Rejected', color: 'text-red-600' },
    { value: 'implemented', label: 'Implemented', color: 'text-blue-600' },
    { value: 'dismissed', label: 'Dismissed', color: 'text-gray-600' }
  ];

  const types = [
    { value: 'improvement', label: 'Improvement' },
    { value: 'bug_fix', label: 'Bug Fix' },
    { value: 'optimization', label: 'Optimization' },
    { value: 'refactoring', label: 'Refactoring' },
    { value: 'security', label: 'Security' },
    { value: 'style', label: 'Style' }
  ];

  const handleArrayFilterChange = (
    key: 'category' | 'severity' | 'status' | 'type',
    value: string
  ) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    onFiltersChange({
      ...filters,
      [key]: newArray
    });
  };

  const handleConfidenceChange = (
    key: 'minConfidence' | 'maxConfidence',
    value: number
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      category: [],
      severity: [],
      status: [],
      type: [],
      minConfidence: 0,
      maxConfidence: 1
    });
  };

  const hasActiveFilters = 
    filters.category.length > 0 ||
    filters.severity.length > 0 ||
    filters.status.length > 0 ||
    filters.type.length > 0 ||
    filters.minConfidence > 0 ||
    filters.maxConfidence < 1;

  return (
    <div className="relative">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
      >
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
            {filters.category.length + filters.severity.length + filters.status.length + filters.type.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showFilters && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="space-y-1">
                {categories.map((category) => (
                  <label key={category.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.category.includes(category.value)}
                      onChange={() => handleArrayFilterChange('category', category.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {category.icon} {category.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Severities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <div className="space-y-1">
                {severities.map((severity) => (
                  <label key={severity.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.severity.includes(severity.value)}
                      onChange={() => handleArrayFilterChange('severity', severity.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${severity.color}`}>
                      {severity.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-1">
                {statuses.map((status) => (
                  <label key={status.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status.value)}
                      onChange={() => handleArrayFilterChange('status', status.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${status.color}`}>
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Types
              </label>
              <div className="space-y-1">
                {types.map((type) => (
                  <label key={type.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type.value)}
                      onChange={() => handleArrayFilterChange('type', type.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Confidence Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Range
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.minConfidence}
                    onChange={(e) => handleConfidenceChange('minConfidence', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">
                    {Math.round(filters.minConfidence * 100)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.maxConfidence}
                    onChange={(e) => handleConfidenceChange('maxConfidence', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">
                    {Math.round(filters.maxConfidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionFilters;
