/**
 * Simple API Client for Project Management Platform
 * 
 * Basic wrapper for API calls with optional logging
 */

import { track } from './analyticsLogger';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set user ID header for backend authentication
   */
  setUserIdHeader(userId: string): void {
    this.defaultHeaders['x-user-id'] = userId;
  }

  /**
   * Remove user ID header
   */
  removeUserIdHeader(): void {
    delete this.defaultHeaders['x-user-id'];
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return url.toString();
  }

  /**
   * Make HTTP request
   */
  private async request<T = any>(
    method: string,
    endpoint: string,
    body?: any,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, params);
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.defaultHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      let responseData: T;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text() as unknown as T;
      }

      if (!response.ok) {
        // Log API errors
        track('api_error', {
          method,
          url,
          status: response.status,
          error: responseData,
        });

        const error: ApiError = {
          message: `HTTP ${response.status}`,
          status: response.status,
          data: responseData,
        };
        throw error;
      }

      // Log successful API calls
      track('api_success', {
        method,
        url,
        status: response.status,
      });

      return {
        data: responseData,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        throw error; // Re-throw API errors
      }

      // Network errors
      track('api_network_error', {
        method,
        url,
        error: error instanceof Error ? error.message : 'Network error',
      });

      throw {
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, params);
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body);
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient; 