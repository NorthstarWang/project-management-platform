/**
 * Simple API Client for Project Management Platform
 * 
 * Basic wrapper for API calls with optional logging and session management
 */

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
  private sessionId: string | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Initialize session from localStorage on client side
    if (typeof window !== 'undefined') {
      this.restoreSession();
    }
  }

  /**
   * Restore session from localStorage
   */
  private restoreSession(): void {
    const storedSessionId = localStorage.getItem('session_id');
    const storedUser = localStorage.getItem('user');
    
    if (storedSessionId) {
      this.sessionId = storedSessionId;
    }
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.setUserIdHeader(user.id);
      } catch (error) {
        console.warn('Failed to parse stored user data:', error);
        // Clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('session_id');
      }
    }
  }

  /**
   * Set session ID for API requests
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('session_id', sessionId);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
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
   * Clear session data
   */
  clearSession(): void {
    this.sessionId = null;
    this.removeUserIdHeader();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_id');
      localStorage.removeItem('user');
    }
  }

  /**
   * Debug method to inspect current API client state
   */
  getDebugInfo(): any {
    return {
      sessionId: this.sessionId,
      headers: { ...this.defaultHeaders },
      hasUserIdHeader: !!this.defaultHeaders['x-user-id'],
      userIdValue: this.defaultHeaders['x-user-id']
    };
  }

  /**
   * Build URL with query parameters, automatically including session_id
   */
  private buildURL(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseURL);
    
    // Automatically add session_id if available and not already present
    if (this.sessionId && !params?.session_id && !url.searchParams.has('session_id')) {
      url.searchParams.append('session_id', this.sessionId);
    }
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return url.toString();
  }

  /**
   * Conditionally track events (only on client side)
   */
  private async trackEvent(eventType: string, data: any): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const { track } = await import('./analyticsLogger');
        track(eventType, {
          text: data.text || `User triggered ${eventType} event`,
          ...data
        });
      } catch (error) {
        // Silently fail if analytics logger is not available
        console.warn('Analytics tracking failed:', error);
      }
    }
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
    
    // Create a fresh copy of headers to avoid mutation issues
    const requestHeaders = { ...this.defaultHeaders };
    
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
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
        this.trackEvent('api_error', {
          text: `User's API ${method} request to ${endpoint} failed with status ${response.status}`,
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
      this.trackEvent('api_success', {
        text: `User's API ${method} request to ${endpoint} succeeded with status ${response.status}`,
        method,
        url,
        status: response.status,
      });

      return {
        data: responseData,
        status: response.status,
      };
    } catch (error) {
      if ((error as ApiError).status !== undefined) {
        throw error; // Re-throw API errors
      }

      // Network errors
      this.trackEvent('api_network_error', {
        text: `User's API ${method} request to ${endpoint} failed due to network error`,
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
  async post<T = any>(endpoint: string, body?: any, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, params);
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, params);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, params);
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient; 