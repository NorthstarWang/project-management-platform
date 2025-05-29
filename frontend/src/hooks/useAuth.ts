'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member';
  created_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = () => {
    try {
      const userData = localStorage.getItem('user');
      const sessionId = localStorage.getItem('session_id');

      if (userData && sessionId) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Ensure API client is properly configured
        apiClient.setSessionId(sessionId);
        apiClient.setUserIdHeader(parsedUser.id);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Clear invalid data
      apiClient.clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.clearSession();
    setUser(null);
    router.push('/login');
  };

  const isAuthenticated = !!user && !!apiClient.getSessionId();

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    refreshAuth: initializeAuth
  };
} 