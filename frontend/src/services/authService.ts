/**
 * Authentication Service
 * Handles the complete authentication flow following the backend's expected pattern
 */

import apiClient from './apiClient';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member';
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

class AuthenticationService {
  private sessionId: string | null = null;
  private currentUser: User | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      this.restoreFromStorage();
    }
  }

  /**
   * Restore authentication state from localStorage
   */
  private restoreFromStorage(): void {
    try {
      const storedSessionId = localStorage.getItem('session_id');
      const storedUser = localStorage.getItem('user');

      if (storedSessionId && storedUser) {
        this.sessionId = storedSessionId;
        this.currentUser = JSON.parse(storedUser);
        
        // Configure API client - both values are guaranteed to be non-null here
        if (this.sessionId && this.currentUser) {
          this.configureApiClient();
          console.log('✅ Auth restored from storage:', this.currentUser.username);
        }
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to restore auth from storage:', error);
      this.clearSession();
      this.isInitialized = true;
    }
  }

  /**
   * Configure API client with current session data
   */
  private configureApiClient(): void {
    if (this.sessionId && this.currentUser) {
      apiClient.setSessionId(this.sessionId);
      apiClient.setUserIdHeader(this.currentUser.id);
      console.log('🔧 API client configured with session:', this.sessionId, 'and user:', this.currentUser.id);
    } else {
      console.log('❌ Cannot configure API client - missing session or user');
    }
  }

  /**
   * Ensure API client is properly configured
   */
  ensureApiClientConfigured(): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    // Re-configure API client to ensure it has the latest session data
    this.configureApiClient();
    return true;
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInitialization(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Wait for initialization with timeout
    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInitialized, 10);
        }
      };
      checkInitialized();
    });
  }

  /**
   * Complete login flow following backend expectations
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('🔄 Starting authentication flow...');

      // Step 1: Initialize a new session
      console.log('📝 Step 1: Creating new session...');
      const sessionResponse = await fetch('http://localhost:8000/_synthetic/new_session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.status}`);
      }

      const sessionData = await sessionResponse.json();
      this.sessionId = sessionData.session_id;
      console.log('✅ Session created:', this.sessionId);

      // Step 2: Configure API client with session
      if (this.sessionId) {
        apiClient.setSessionId(this.sessionId);
        console.log('✅ API client configured with session');
      } else {
        throw new Error('Session ID is null after creation');
      }

      // Step 3: Attempt login with session_id as query parameter
      console.log('🔐 Step 2: Attempting login...');
      const loginUrl = `http://localhost:8000/api/login?session_id=${this.sessionId}`;
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.detail || `Login failed: ${loginResponse.status}`);
      }

      const userData = await loginResponse.json();
      this.currentUser = userData;
      console.log('✅ Login successful for user:', userData.username);

      // Step 4: Configure API client with user ID header and wait for it to be ready
      console.log('🔧 Step 3: Configuring API client with user authentication...');
      apiClient.setUserIdHeader(userData.id);
      this.configureApiClient();

      // Step 5: Store in localStorage AFTER successful configuration
      if (this.sessionId) {
        localStorage.setItem('session_id', this.sessionId);
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ Authentication data stored');
      }

      // Step 6: Verify authentication works before returning success
      console.log('🧪 Step 4: Verifying authentication is working...');
      try {
        const verifyResponse = await apiClient.get('/api/users/me');
        console.log('✅ Authentication verified:', verifyResponse.data.username);
      } catch (verifyError) {
        console.error('❌ Authentication verification failed:', verifyError);
        // Clear everything and fail
        this.clearSession();
        throw new Error('Failed to verify authentication after login');
      }

      // Step 7: Mark as initialized and return success
      this.isInitialized = true;
      console.log('🎉 Login flow completed successfully!');

      return {
        success: true,
        user: userData
      };

    } catch (error: any) {
      console.error('❌ Authentication failed:', error);
      this.clearSession();
      
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    console.log('🔄 Starting logout process...');
    
    try {
      // Log the logout event if we have a session
      if (this.sessionId && this.currentUser) {
        console.log('📝 Logging logout event...');
        await this.logEvent('USER_LOGOUT', {
          user_id: this.currentUser.id,
          username: this.currentUser.username,
        });
      }
    } catch (error) {
      console.warn('Failed to log logout event:', error);
    }
    
    // Always clear session regardless of logging success/failure
    console.log('🧹 Clearing session data...');
    this.clearSession();
    
    console.log('✅ Logout process completed');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const hasSessionData = !!(this.sessionId && this.currentUser);
    const hasStorageData = typeof window !== 'undefined' && 
      !!(localStorage.getItem('session_id') && localStorage.getItem('user'));
    
    // If memory and storage are out of sync, clear everything
    if (hasSessionData !== hasStorageData) {
      console.log('⚠️ Auth state mismatch detected, clearing session');
      this.clearSession();
      return false;
    }
    
    return hasSessionData;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if user should be redirected from public routes
   */
  shouldRedirectFromPublicRoute(pathname: string): boolean {
    const publicRoutes = ['/', '/login', '/register'];
    return this.isAuthenticated() && publicRoutes.includes(pathname);
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      // Ensure API client is configured
      this.ensureApiClientConfigured();

      // Test with a simple API call
      await apiClient.get('/api/users/me');
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Clear all session data - Enhanced for security
   */
  private clearSession(): void {
    console.log('🧹 Clearing all authentication data...');
    
    // Clear memory state
    this.sessionId = null;
    this.currentUser = null;
    this.isInitialized = true;
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('session_id');
        localStorage.removeItem('user');
        console.log('✅ LocalStorage cleared');
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
      }
    }
    
    // Clear API client session
    try {
      apiClient.clearSession();
      console.log('✅ API client session cleared');
    } catch (error) {
      console.error('Failed to clear API client session:', error);
    }
    
    console.log('✅ Session clearing completed');
  }

  /**
   * Log an event to the synthetic backend
   */
  private async logEvent(actionType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.sessionId) return;

    try {
      const url = `http://localhost:8000/_synthetic/log_event?session_id=${this.sessionId}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType,
          payload: {
            ...payload,
            timestamp: Date.now(),
            page_url: typeof window !== 'undefined' ? window.location.href : '',
          },
        }),
      });
    } catch (error) {
      console.error('Failed to log event:', error);
      // Don't throw - logging failures shouldn't break auth
    }
  }
}

// Export singleton instance
export const authService = new AuthenticationService();
export default authService; 