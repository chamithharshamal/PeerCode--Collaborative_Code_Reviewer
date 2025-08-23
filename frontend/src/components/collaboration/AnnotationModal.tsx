'use client';

import React, { useState, useEffect } from 'react';
import { Annotation } from '@/types';

interface AnnotationModalProps {
  annotation: Annotation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, updates: {
    content?: string;
    type?: 'comment' | 'suggestion' | 'question';
  }) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
  isReadOnly?: boolean;
}

export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  annotation,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  currentUserId,
  isReadOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<'comment' | 'suggestion' | 'question'>('comment');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (annotation) {
      setEditContent(annotation.content);
      setEditType(annotation.type);
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [annotation]);

  if (!isOpen || !annotation) {
    return null;
  }

  const canEdit = !isReadOnly && currentUserId === annotation.userId;

  const handleSave = () => {
    if (!editContent.trim() || !onUpdate) return;

    onUpdate(annotation.id, {
      content: editContent.trim(),
      type: editType
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(annotation.content);
    setEditType(annotation.type);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(annotation.id);
      onClose();
    }
  };

  const getTypeColor = (type: Annotation['type']) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'suggestion':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'question':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                isEditing ? editType : annotation.type
              )}`}
            >
              {isEditing ? editType : annotation.type}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Lines {annotation.lineStart + 1}-{annotation.lineEnd + 1}
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'comment' | 'suggestion' | 'question')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="comment">Comment</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="question">Question</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                  rows={6}
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Annotation Content
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {annotation.content}
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Created by:</span>
                <p className="text-gray-900 dark:text-gray-100">
                  User {annotation.userId.slice(0, 8)}...
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Created at:</span>
                <p className="text-gray-900 dark:text-gray-100">
                  {formatDateTime(annotation.createdAt)}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Position:</span>
                <p className="text-gray-900 dark:text-gray-100">
                  Line {annotation.lineStart + 1}:{annotation.columnStart + 1} - 
                  Line {annotation.lineEnd + 1}:{annotation.columnEnd + 1}
                </p>
              </div>
              {annotation.updatedAt && annotation.updatedAt !== annotation.createdAt && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Updated at:</span>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDateTime(annotation.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {isEditing ? (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editContent.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <>
                <div>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Are you sure?
                      </span>
                      <button
                        onClick={handleDelete}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};