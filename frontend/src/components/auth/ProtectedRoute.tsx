'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import authService from '@/services/authService';

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

  const checkAuthentication = useCallback(async () => {
    try {
      console.log('🔍 ProtectedRoute: Checking authentication for route:', pathname);

      // Wait for auth service to initialize
      await authService.waitForInitialization();
      console.log('🔍 ProtectedRoute: Auth service initialized');

      // Check if authenticated user is trying to access public routes
      if (authService.shouldRedirectFromPublicRoute(pathname)) {
        console.log('✅ ProtectedRoute: Authenticated user accessing public route, redirecting to dashboard');
        setIsAuthenticated(true);
        setIsLoading(false);
        router.push('/dashboard');
        return;
      }

      // If it's a public route and user is not authenticated, allow access
      if (isPublicRoute) {
        console.log('✅ ProtectedRoute: Public route access allowed');
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // For protected routes, check authentication
      if (!authService.isAuthenticated()) {
        console.log('❌ ProtectedRoute: No authentication found, redirecting to login');
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
        return;
      }

      // Ensure API client is properly configured before allowing access
      console.log('🔧 ProtectedRoute: Ensuring API client is configured...');
      const isConfigured = authService.ensureApiClientConfigured();
      
      if (!isConfigured) {
        console.log('❌ ProtectedRoute: Failed to configure API client, redirecting to login');
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
        return;
      }

      // Validate the current session with a simple test
      console.log('🧪 ProtectedRoute: Validating current session...');
      const isValid = await authService.validateSession();
      
      if (isValid) {
        console.log('✅ ProtectedRoute: Session validation successful');
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        console.log('❌ ProtectedRoute: Session validation failed, redirecting to login');
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
      }

    } catch (error) {
      console.error('❌ ProtectedRoute: Authentication check failed:', error);
      setIsAuthenticated(false);
      setIsLoading(false);
      
      // Only redirect to login if this is not a public route
      if (!isPublicRoute) {
        router.push('/login');
      }
    }
  }, [pathname, isPublicRoute, router]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  // Listen for storage changes (logout events)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If session_id or user was removed, it means logout occurred
      if ((e.key === 'session_id' || e.key === 'user') && e.newValue === null) {
        console.log('🔄 ProtectedRoute: Detected logout via storage change, re-checking auth');
        checkAuthentication();
      }
    };

    // Listen for changes in localStorage
    window.addEventListener('storage', handleStorageChange);

    // Also listen for manual localStorage clearing
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (key === 'session_id' || key === 'user') {
        console.log('🔄 ProtectedRoute: Detected auth data removal, re-checking auth');
        setTimeout(() => checkAuthentication(), 10);
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      localStorage.removeItem = originalRemoveItem;
    };
  }, [checkAuthentication]);

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