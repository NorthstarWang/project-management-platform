'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, RegisterData, auth } from '@/lib/auth';

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
    const initializeAuth = () => {
      const user = auth.getCurrentUser();
      const sessionId = auth.getSessionId();
      const isAuthenticated = auth.isAuthenticated();

      setAuthState({
        user,
        isAuthenticated,
        isLoading: false,
        sessionId,
      });
    };

    initializeAuth();
  }, []);

  const handleLogin = async (credentials: LoginCredentials): Promise<User> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const user = await auth.login(credentials);
      const sessionId = auth.getSessionId();
      
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        sessionId,
      });
      
      return user;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleRegister = async (data: RegisterData): Promise<User> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const user = await auth.register(data);
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
      
      return user;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleLogout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await auth.logout();
      
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
    const sessionId = await auth.initializeSession(seed);
    
    setAuthState(prev => ({
      ...prev,
      sessionId,
    }));
    
    return sessionId;
  };

  const handleResetEnvironment = async (seed?: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await auth.resetEnvironment(seed);
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: null,
      });
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