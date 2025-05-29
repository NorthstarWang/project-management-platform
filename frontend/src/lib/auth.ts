// Mock Authentication System for Synthetic Environment
// Provides production-like auth experience without external dependencies

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member';
  team_id?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member';
}

// Mock API base URL - can be configured via environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class MockAuthService {
  private sessionId: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    // Initialize from localStorage on client side
    if (typeof window !== 'undefined') {
      this.sessionId = localStorage.getItem('session_id');
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData);
        } catch {
          this.clearSession();
        }
      }
    }
  }

  /**
   * Initialize a new session with the synthetic backend
   */
  async initializeSession(seed?: string): Promise<string> {
    try {
      const url = new URL('/_synthetic/new_session', API_BASE_URL);
      if (seed) {
        url.searchParams.set('seed', seed);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initialize session');
      }

      const data = await response.json();
      this.sessionId = data.session_id;

      // Store session ID
      if (typeof window !== 'undefined' && this.sessionId) {
        localStorage.setItem('session_id', this.sessionId);
      }

      return this.sessionId!;
    } catch (error) {
      console.error('Session initialization failed:', error);
      throw error;
    }
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      // Ensure we have a session
      if (!this.sessionId) {
        await this.initializeSession();
      }

      const url = new URL('/api/login', API_BASE_URL);
      if (!this.sessionId) {
        throw new Error('No session available');
      }
      url.searchParams.set('session_id', this.sessionId);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          email: '', // Required by backend but not used for login
          full_name: '', // Required by backend but not used for login
          role: 'member', // Required by backend but not used for login
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const userData = await response.json();
      this.currentUser = userData;

      // Store user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData));
      }

      // Log the login event
      await this.logEvent('USER_LOGIN', {
        user_id: userData.id,
        username: userData.username,
        role: userData.role,
      });

      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      // Ensure we have a session
      if (!this.sessionId) {
        await this.initializeSession();
      }

      const url = new URL('/api/register', API_BASE_URL);
      if (!this.sessionId) {
        throw new Error('No session available');
      }
      url.searchParams.set('session_id', this.sessionId);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const userData = await response.json();

      // Log the registration event
      await this.logEvent('USER_REGISTER', {
        user_id: userData.id,
        username: userData.username,
        role: userData.role,
      });

      return userData;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      if (this.currentUser) {
        // Log the logout event
        await this.logEvent('USER_LOGOUT', {
          user_id: this.currentUser.id,
          username: this.currentUser.username,
        });
      }

      this.clearSession();
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear session anyway
      this.clearSession();
    }
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
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.sessionId !== null;
  }

  /**
   * Clear session data
   */
  private clearSession(): void {
    this.sessionId = null;
    this.currentUser = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_id');
      localStorage.removeItem('user');
    }
  }

  /**
   * Log an event to the synthetic backend
   */
  private async logEvent(actionType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.sessionId) return;

    try {
      const url = new URL('/_synthetic/log_event', API_BASE_URL);
      url.searchParams.set('session_id', this.sessionId);

      await fetch(url.toString(), {
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

  /**
   * Reset the synthetic environment
   */
  async resetEnvironment(seed?: string): Promise<void> {
    try {
      const url = new URL('/_synthetic/reset', API_BASE_URL);
      if (seed) {
        url.searchParams.set('seed', seed);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset environment');
      }

      // Clear local session after reset
      this.clearSession();
    } catch (error) {
      console.error('Environment reset failed:', error);
      throw error;
    }
  }

  /**
   * Get backend state (for debugging/testing)
   */
  async getBackendState(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${API_BASE_URL}/_synthetic/state`, {
        headers: {
          'Cookie': this.sessionId ? `session_id=${this.sessionId}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get backend state');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get backend state:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new MockAuthService();

// Utility functions for common auth operations
export const auth = {
  login: (credentials: LoginCredentials) => authService.login(credentials),
  register: (data: RegisterData) => authService.register(data),
  logout: () => authService.logout(),
  getCurrentUser: () => authService.getCurrentUser(),
  getSessionId: () => authService.getSessionId(),
  isAuthenticated: () => authService.isAuthenticated(),
  initializeSession: (seed?: string) => authService.initializeSession(seed),
  resetEnvironment: (seed?: string) => authService.resetEnvironment(seed),
  getBackendState: () => authService.getBackendState(),
};

// Default test users for easy access
export const TEST_USERS = {
  admin: {
    username: 'admin_alice',
    password: 'admin123',
  },
  manager: {
    username: 'manager_david',
    password: 'manager123',
  },
  member: {
    username: 'frontend_emma',
    password: 'dev123',
  },
} as const; 