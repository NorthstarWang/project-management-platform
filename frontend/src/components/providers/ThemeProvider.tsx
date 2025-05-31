'use client';

import { useEffect, useState } from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to prevent hydration mismatches
    setMounted(true);

    // Initialize theme immediately on mount
    const initializeTheme = () => {
      try {
        // Get saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const preferredTheme = savedTheme || 'dark';
        
        console.log('🎨 ThemeProvider: Initializing theme to:', preferredTheme);
        
        // Apply theme to document root
        const root = document.documentElement;
        
        if (preferredTheme === 'light') {
          root.setAttribute('data-theme', 'light');
          console.log('🌞 ThemeProvider: Applied light theme');
        } else {
          root.removeAttribute('data-theme');
          console.log('🌙 ThemeProvider: Applied dark theme');
        }
        
        // Store theme preference if not already stored
        if (!savedTheme) {
          localStorage.setItem('theme', preferredTheme);
          console.log('💾 ThemeProvider: Saved default theme preference');
        }
      } catch (error) {
        console.error('Failed to initialize theme:', error);
        // Fallback to dark theme
        document.documentElement.removeAttribute('data-theme');
      }
    };

    // Initialize theme immediately
    initializeTheme();

    // Listen for theme changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as 'light' | 'dark';
        console.log('🔄 ThemeProvider: Theme change detected from storage:', newTheme);
        
        const root = document.documentElement;
        if (newTheme === 'light') {
          root.setAttribute('data-theme', 'light');
        } else {
          root.removeAttribute('data-theme');
        }
      }
    };

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Prevent hydration mismatch by not rendering children until mounted
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
} 