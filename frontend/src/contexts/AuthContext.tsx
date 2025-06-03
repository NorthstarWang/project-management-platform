'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import authService from '@/services/authService';
import type { User, LoginCredentials } from '@/services/authService';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member';
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  initializeSession: (seed?: string) => Promise<string>;
  resetEnvironment: (seed?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionId: null,
  });

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Wait for auth service to initialize
        await authService.waitForInitialization();
        
        const user = authService.getCurrentUser();
        const sessionId = authService.getSessionId();
        const isAuthenticated = authService.isAuthenticated();

        setAuthState({
          user,
          isAuthenticated,
          isLoading: false,
          sessionId,
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionId: null,
        });
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async (credentials: LoginCredentials): Promise<User> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        const sessionId = authService.getSessionId();
        
        setAuthState({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          sessionId,
        });
        
        return result.user;
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleRegister = async (data: RegisterData): Promise<User> {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // For registration, we'll need to implement this in authService
      // For now, throw an error since the current authService doesn't have register
      throw new Error('Registration not implemented in authService yet');
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleLogout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await authService.logout();
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: null,
      });
    } catch (error) {
      // Clear state anyway on logout error
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: null,
      });
      throw error;
    }
  };

  const handleInitializeSession = async (seed?: string): Promise<string> => {
    // This would need to be implemented in authService if needed
    throw new Error('Session initialization not implemented in authService yet');
  };

  const handleResetEnvironment = async (seed?: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // This would need to be implemented in authService if needed
      throw new Error('Environment reset not implemented in authService yet');
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    initializeSession: handleInitializeSession,
    resetEnvironment: handleResetEnvironment,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user has specific role
export function useRole(requiredRole: User['role']): boolean {
  const { user } = useAuth();
  return user?.role === requiredRole;
}

// Hook for checking if user has minimum role level
export function useMinRole(minRole: User['role']): boolean {
  const { user } = useAuth();
  if (!user) return false;
  
  const roleHierarchy = { member: 1, manager: 2, admin: 3 };
  return roleHierarchy[user.role] >= roleHierarchy[minRole];
}

// Hook for protected routes
export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);
  
  return { isAuthenticated, isLoading };
} 