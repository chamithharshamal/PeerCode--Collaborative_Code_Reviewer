import { Annotation } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface CreateAnnotationRequest {
  sessionId: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  content: string;
  type: 'comment' | 'suggestion' | 'question';
}

export interface UpdateAnnotationRequest {
  content?: string;
  type?: 'comment' | 'suggestion' | 'question';
  lineStart?: number;
  lineEnd?: number;
  columnStart?: number;
  columnEnd?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AnnotationAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async createAnnotation(request: CreateAnnotationRequest): Promise<ApiResponse<Annotation>> {
    return this.request<Annotation>('/annotations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAnnotation(id: string): Promise<ApiResponse<Annotation>> {
    return this.request<Annotation>(`/annotations/${id}`);
  }

  async getSessionAnnotations(sessionId: string): Promise<ApiResponse<Annotation[]>> {
    return this.request<Annotation[]>(`/sessions/${sessionId}/annotations`);
  }

  async getUserAnnotations(userId: string): Promise<ApiResponse<Annotation[]>> {
    return this.request<Annotation[]>(`/users/${userId}/annotations`);
  }

  async updateAnnotation(
    id: string,
    updates: UpdateAnnotationRequest
  ): Promise<ApiResponse<Annotation>> {
    return this.request<Annotation>(`/annotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteAnnotation(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/annotations/${id}`, {
      method: 'DELETE',
    });
  }

  async getAnnotationsByLineRange(
    sessionId: string,
    lineStart: number,
    lineEnd: number
  ): Promise<ApiResponse<Annotation[]>> {
    const params = new URLSearchParams({
      lineStart: lineStart.toString(),
      lineEnd: lineEnd.toString(),
    });

    return this.request<Annotation[]>(
      `/sessions/${sessionId}/annotations/line-range?${params}`
    );
  }

  async clearSessionAnnotations(
    sessionId: string
  ): Promise<ApiResponse<{ message: string; deletedCount: number }>> {
    return this.request<{ message: string; deletedCount: number }>(
      `/sessions/${sessionId}/annotations`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const annotationAPI = new AnnotationAPI();