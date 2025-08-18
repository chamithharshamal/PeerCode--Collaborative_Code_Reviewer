import { CodeSnippet } from '../types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string[];
}

export interface UploadTextRequest {
  content: string;
  filename?: string;
  language?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Upload a code snippet file
 */
export async function uploadCodeSnippetFile(file: File): Promise<ApiResponse<CodeSnippet>> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/code-snippets/upload`, {
      method: 'POST',
      body: formData,
    });

    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: 'Network error occurred during upload',
    };
  }
}

/**
 * Upload code snippet from text content
 */
export async function uploadCodeSnippetText(request: UploadTextRequest): Promise<ApiResponse<CodeSnippet>> {
  try {
    const response = await fetch(`${API_BASE_URL}/code-snippets/upload-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return await response.json();
  } catch (error) {
    console.error('Error uploading text:', error);
    return {
      success: false,
      error: 'Network error occurred during upload',
    };
  }
}

/**
 * Get a code snippet by ID
 */
export async function getCodeSnippet(id: string): Promise<ApiResponse<CodeSnippet>> {
  try {
    const response = await fetch(`${API_BASE_URL}/code-snippets/${id}`, {
      method: 'GET',
    });

    return await response.json();
  } catch (error) {
    console.error('Error fetching code snippet:', error);
    return {
      success: false,
      error: 'Network error occurred while fetching code snippet',
    };
  }
}

/**
 * Delete a code snippet by ID
 */
export async function deleteCodeSnippet(id: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE_URL}/code-snippets/${id}`, {
      method: 'DELETE',
    });

    return await response.json();
  } catch (error) {
    console.error('Error deleting code snippet:', error);
    return {
      success: false,
      error: 'Network error occurred while deleting code snippet',
    };
  }
}