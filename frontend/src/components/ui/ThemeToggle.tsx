'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Sun, Moon } from 'lucide-react';
import { useGlobalOverlay } from '@/components/providers/GlobalOverlayProvider';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { showThemeTransition } = useGlobalOverlay();

  useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const preferredTheme = savedTheme || 'dark';
    
    setTheme(preferredTheme);
    applyTheme(preferredTheme);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (newTheme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    // Set transitioning state
    setIsTransitioning(true);
    
    try {
      // Show the global transition overlay first (without changing theme yet)
      const overlayPromise = showThemeTransition(newTheme);
      
      // Delay the actual theme change until middle of animation (1.5 seconds)
      setTimeout(() => {
        setTheme(newTheme);
        applyTheme(newTheme);
      }, 1500);
      
      // Wait for overlay to complete
      await overlayPromise;
    } catch (error) {
      console.error('Theme transition failed:', error);
    } finally {
      // Reset transitioning state
      setIsTransitioning(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="relative w-8 h-8 p-0 transition-all duration-300"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      disabled={isTransitioning}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Sun className={`h-4 w-4 transition-all duration-300 ${theme === 'light' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
        <Moon className={`absolute h-4 w-4 transition-all duration-300 ${theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
      </div>
    </Button>
  );
} 