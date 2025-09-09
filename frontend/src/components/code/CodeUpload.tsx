'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { CodeSnippet } from '../../types';

interface CodeUploadProps {
  onUploadSuccess: (codeSnippet: CodeSnippet) => void;
  onUploadError: (error: string) => void;
  className?: string;
  maxSize?: number;
  allowedFileTypes?: string[];
}

interface UploadResponse {
  success: boolean;
  data?: CodeSnippet;
  error?: string;
  details?: string[];
}

interface ValidationError {
  type: 'file' | 'content' | 'size' | 'extension';
  message: string;
}

export default function CodeUpload({ 
  onUploadSuccess, 
  onUploadError, 
  className = '',
  maxSize = 1024 * 1024, // 1MB default
  allowedFileTypes = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sh', '.bash', '.sql', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.md', '.txt']
}: CodeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [filename, setFilename] = useState('');
  const [language, setLanguage] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side validation
  const validateFile = (file: File): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Check file size
    if (file.size > maxSize) {
      errors.push({
        type: 'size',
        message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
      });
    }
    
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      errors.push({
        type: 'extension',
        message: `File type ${fileExtension} is not supported. Allowed types: ${allowedFileTypes.join(', ')}`
      });
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push({
        type: 'file',
        message: 'File is empty'
      });
    }
    
    return errors;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationErrors([]);
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors: ValidationError[] = [];
      rejectedFiles.forEach(({ file, errors: fileErrors }) => {
        fileErrors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            errors.push({
              type: 'size',
              message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
            });
          } else if (error.code === 'file-invalid-type') {
            errors.push({
              type: 'extension',
              message: `File type is not supported. Allowed types: ${allowedFileTypes.join(', ')}`
            });
          }
        });
      });
      setValidationErrors(errors);
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Additional client-side validation
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/code-snippets/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.data) {
        onUploadSuccess(result.data);
        setValidationErrors([]);
      } else {
        const errorMessage = result.error || 'Upload failed';
        const details = result.details ? ` Details: ${result.details.join(', ')}` : '';
        onUploadError(errorMessage + details);
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Network error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, onUploadError, maxSize, allowedFileTypes]);

  const handleTextUpload = async () => {
    setValidationErrors([]);
    
    if (!textContent.trim()) {
      setValidationErrors([{
        type: 'content',
        message: 'Please enter some code content'
      }]);
      return;
    }

    // Client-side validation for text content
    const contentSize = new Blob([textContent]).size;
    if (contentSize > maxSize) {
      setValidationErrors([{
        type: 'size',
        message: `Content size (${formatFileSize(contentSize)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
      }]);
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/code-snippets/upload-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent,
          filename: filename || undefined,
          language: language || undefined,
        }),
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.data) {
        onUploadSuccess(result.data);
        setTextContent('');
        setFilename('');
        setLanguage('');
        setValidationErrors([]);
      } else {
        const errorMessage = result.error || 'Upload failed';
        const details = result.details ? ` Details: ${result.details.join(', ')}` : '';
        onUploadError(errorMessage + details);
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Network error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': allowedFileTypes,
    },
    maxFiles: 1,
    maxSize: maxSize,
    disabled: isUploading,
    multiple: false,
  });

  const supportedLanguages = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby',
    'go', 'rust', 'swift', 'kotlin', 'scala', 'bash', 'sql', 'html', 'css', 'json',
    'xml', 'yaml', 'markdown', 'plaintext'
  ];

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-4">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => {
              setUploadMode('file');
              setValidationErrors([]);
            }}
            className={`px-4 py-2 rounded-md font-medium ${
              uploadMode === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => {
              setUploadMode('text');
              setValidationErrors([]);
            }}
            className={`px-4 py-2 rounded-md font-medium ${
              uploadMode === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Paste Code
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadMode === 'file' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isUploading ? (
              <p className="text-gray-600">Uploading...</p>
            ) : isDragActive ? (
              <p className="text-blue-600">Drop the file here...</p>
            ) : (
              <>
                <p className="text-gray-600">
                  Drag and drop a code file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports most programming languages (max 1MB)
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-1">
                Filename (optional)
              </label>
              <input
                type="text"
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="example.js"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                Language (optional)
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto-detect</option>
                {supportedLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Code Content
            </label>
            <textarea
              id="content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your code here..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
          <button
            onClick={handleTextUpload}
            disabled={isUploading || !textContent.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Code'}
          </button>
        </div>
      )}
    </div>
  );
}