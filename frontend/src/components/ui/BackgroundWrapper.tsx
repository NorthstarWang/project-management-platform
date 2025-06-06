'use client';

import React, { memo } from 'react';
import AnimatedGradientBackground from './AnimatedGradientBackground';

interface BackgroundWrapperProps {
  children: React.ReactNode;
  showBubbles?: boolean;
}

// This wrapper component isolates the background from parent re-renders
const BackgroundWrapper = memo(({ children, showBubbles = true }: BackgroundWrapperProps) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background is isolated and won't re-render unless showBubbles changes */}
      <AnimatedGradientBackground className="z-0" showBubbles={showBubbles} />
      
      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if showBubbles changes or children identity changes
  return prevProps.showBubbles === nextProps.showBubbles &&
         prevProps.children === nextProps.children;
});

BackgroundWrapper.displayName = 'BackgroundWrapper';

export default BackgroundWrapper;