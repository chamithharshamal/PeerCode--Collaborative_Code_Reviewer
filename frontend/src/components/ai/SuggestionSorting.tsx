'use client';

import React, { useState } from 'react';

interface SuggestionSortingProps {
  sorting: {
    field: 'createdAt' | 'confidence' | 'severity' | 'title';
    order: 'asc' | 'desc';
  };
  onSortingChange: (sorting: typeof sorting) => void;
}

const SuggestionSorting: React.FC<SuggestionSortingProps> = ({
  sorting,
  onSortingChange
}) => {
  const [showSorting, setShowSorting] = useState(false);

  const sortFields = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'confidence', label: 'Confidence' },
    { value: 'severity', label: 'Severity' },
    { value: 'title', label: 'Title' }
  ];

  const handleFieldChange = (field: typeof sorting.field) => {
    onSortingChange({
      ...sorting,
      field
    });
  };

  const handleOrderChange = (order: typeof sorting.order) => {
    onSortingChange({
      ...sorting,
      order
    });
  };

  const getSortLabel = () => {
    const field = sortFields.find(f => f.value === sorting.field);
    return `${field?.label} (${sorting.order === 'asc' ? 'A-Z' : 'Z-A'})`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowSorting(!showSorting)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
      >
        <span>Sort: {getSortLabel()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showSorting ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showSorting && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Sort by</h3>

            {/* Sort Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field
              </label>
              <div className="space-y-1">
                {sortFields.map((field) => (
                  <label key={field.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="sortField"
                      value={field.value}
                      checked={sorting.field === field.value}
                      onChange={() => handleFieldChange(field.value as typeof sorting.field)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order
              </label>
              <div className="space-y-1">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="sortOrder"
                    value="asc"
                    checked={sorting.order === 'asc'}
                    onChange={() => handleOrderChange('asc')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Ascending (A-Z)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="sortOrder"
                    value="desc"
                    checked={sorting.order === 'desc'}
                    onChange={() => handleOrderChange('desc')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Descending (Z-A)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionSorting;
