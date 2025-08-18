'use client';

import React, { useState } from 'react';
import CodeUpload from '../../components/code/CodeUpload';
import CodeViewer from '../../components/code/CodeViewer';
import { CodeSnippet } from '../../types';

export default function DemoPage() {
  const [uploadedSnippet, setUploadedSnippet] = useState<CodeSnippet | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleUploadSuccess = (codeSnippet: CodeSnippet) => {
    setUploadedSnippet(codeSnippet);
    setSuccess(`Successfully uploaded: ${codeSnippet.filename || 'Untitled'}`);
    setError('');
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess('');
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Code Upload & Viewer Demo
          </h1>
          <p className="text-gray-600">
            Test the code snippet upload and validation system with syntax highlighting.
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={clearMessages}
                    className="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{success}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={clearMessages}
                    className="bg-green-100 px-2 py-1 rounded text-sm text-green-800 hover:bg-green-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Code</h2>
            <CodeUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>

          {/* Viewer Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Viewer</h2>
            {uploadedSnippet ? (
              <CodeViewer
                codeSnippet={uploadedSnippet}
                height="500px"
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Upload a code file to see it here with syntax highlighting</p>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Features Implemented</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">File Upload</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Drag and drop support</li>
                <li>• File size validation (1MB limit)</li>
                <li>• File type validation</li>
                <li>• Multiple programming languages</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Text Upload</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Paste code directly</li>
                <li>• Auto language detection</li>
                <li>• Manual language selection</li>
                <li>• Content validation</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Code Viewer</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Syntax highlighting</li>
                <li>• Line numbers</li>
                <li>• File information display</li>
                <li>• Monaco Editor integration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Information */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">API Endpoints</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">POST</span>
              <code className="text-blue-800">/api/code-snippets/upload</code>
              <span className="text-gray-600">- Upload file</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">POST</span>
              <code className="text-blue-800">/api/code-snippets/upload-text</code>
              <span className="text-gray-600">- Upload text content</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">GET</span>
              <code className="text-blue-800">/api/code-snippets/:id</code>
              <span className="text-gray-600">- Get code snippet</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">DELETE</span>
              <code className="text-blue-800">/api/code-snippets/:id</code>
              <span className="text-gray-600">- Delete code snippet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}