'use client';

import React, { memo, useRef, useEffect } from 'react';
import AnimatedGradientBackground from './AnimatedGradientBackground';

interface BackgroundWrapperProps {
  children: React.ReactNode;
  showBubbles?: boolean;
}

// Create a stable wrapper that prevents re-renders
const BackgroundContainer = memo(({ showBubbles }: { showBubbles: boolean }) => (
  <AnimatedGradientBackground className="z-0" showBubbles={showBubbles} />
));

BackgroundContainer.displayName = 'BackgroundContainer';

const BackgroundWrapper = ({ children, showBubbles = true }: BackgroundWrapperProps) => {
  // Use ref to track if bubbles prop has actually changed
  const showBubblesRef = useRef(showBubbles);
  const hasChanged = showBubblesRef.current !== showBubbles;
  
  useEffect(() => {
    showBubblesRef.current = showBubbles;
  }, [showBubbles]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background is completely isolated from children re-renders */}
      <BackgroundContainer key={hasChanged ? Date.now() : 'stable'} showBubbles={showBubbles} />
      
      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

BackgroundWrapper.displayName = 'BackgroundWrapper';

export default BackgroundWrapper;