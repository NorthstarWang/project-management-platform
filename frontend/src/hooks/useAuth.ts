'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService, { User } from '@/services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Wait for auth service to initialize
      await authService.waitForInitialization();
      
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        console.log('✅ Auth hook initialized for user:', currentUser.username);
        // Ensure API client is configured
        authService.ensureApiClientConfigured();
      } else {
        console.log('No authenticated user found');
      }
    } catch (error) {
      console.error('Failed to initialize auth hook:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear state anyway
      setUser(null);
      router.push('/login');
    }
  };

  const isAuthenticated = authService.isAuthenticated();

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    refreshAuth: initializeAuth
  };
} 