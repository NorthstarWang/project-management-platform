'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/services/apiClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    checkAuthentication();
  }, [pathname]);

  const checkAuthentication = async () => {
    try {
      // If it's a public route, allow access
      if (isPublicRoute) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Check for stored user data and session
      const userData = localStorage.getItem('user');
      const sessionId = localStorage.getItem('session_id');

      if (!userData || !sessionId) {
        // No stored credentials, redirect to login
        console.log('No stored credentials found, redirecting to login');
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
        return;
      }

      // Parse user data and set up API client
      let user;
      try {
        user = JSON.parse(userData);
      } catch (parseError) {
        console.error('Failed to parse user data:', parseError);
        apiClient.clearSession();
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
        return;
      }

      // Ensure API client has the session and user data
      apiClient.setSessionId(sessionId);
      apiClient.setUserIdHeader(user.id);
      
      console.log('Validating session for user:', user.username, 'with session:', sessionId);

      // Verify session is still valid by making a test API call
      try {
        const response = await apiClient.get('/api/users/me');
        console.log('Session validation successful:', response.data);
        
        // Session is valid
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error: any) {
        console.error('Session validation failed:', {
          error: error,
          message: error?.message,
          status: error?.status,
          data: error?.data
        });
        
        // Check if it's a network error vs authentication error
        if (error?.status === 401 || error?.status === 403) {
          // Authentication/authorization error - clear credentials
          console.log('Authentication error, clearing credentials');
          apiClient.clearSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/login');
        } else if (!error?.status) {
          // Network error - backend might be down, allow access but show warning
          console.warn('Network error during session validation, allowing access');
          setIsAuthenticated(true);
          setIsLoading(false);
          // Could show a toast warning about connectivity issues
        } else {
          // Other server errors - clear credentials to be safe
          console.log('Server error during validation, clearing credentials');
          apiClient.clearSession();
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      apiClient.clearSession();
      setIsAuthenticated(false);
      setIsLoading(false);
      router.push('/login');
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  // If not authenticated and trying to access protected route, don't render children
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  // If authenticated or on public route, render children
  return <>{children}</>;
} 