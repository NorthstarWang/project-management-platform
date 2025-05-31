'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ThemeTransitionOverlay } from '@/components/ui/ThemeTransitionOverlay';

interface GlobalOverlayContextType {
  showThemeTransition: (targetTheme: 'light' | 'dark') => Promise<void>;
}

const GlobalOverlayContext = createContext<GlobalOverlayContextType | null>(null);

interface GlobalOverlayProviderProps {
  children: React.ReactNode;
}

export function GlobalOverlayProvider({ children }: GlobalOverlayProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetTheme, setTargetTheme] = useState<'light' | 'dark'>('dark');
  const [resolveTransition, setResolveTransition] = useState<(() => void) | null>(null);

  const showThemeTransition = useCallback((theme: 'light' | 'dark'): Promise<void> => {
    return new Promise((resolve) => {
      setTargetTheme(theme);
      setIsTransitioning(true);
      setResolveTransition(() => resolve);
    });
  }, []);

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
    setResolveTransition(null);
    
    if (resolveTransition) {
      resolveTransition();
    }
  }, [resolveTransition]);

  return (
    <GlobalOverlayContext.Provider value={{ showThemeTransition }}>
      {children}
      
      {/* Theme Transition Overlay - Outside of theme provider */}
      <ThemeTransitionOverlay
        isVisible={isTransitioning}
        targetTheme={targetTheme}
        onComplete={handleTransitionComplete}
      />
    </GlobalOverlayContext.Provider>
  );
}

export function useGlobalOverlay() {
  const context = useContext(GlobalOverlayContext);
  if (!context) {
    throw new Error('useGlobalOverlay must be used within a GlobalOverlayProvider');
  }
  return context;
} 