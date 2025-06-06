'use client';

import React, { memo } from 'react';

interface AnimatedGradientBackgroundProps {
  className?: string;
  showBubbles?: boolean;
}

// Pure CSS animated bubbles that won't be affected by React re-renders
const CSSBubbles = memo(() => (
  <div className="absolute inset-0 z-[5]">
    {/* Bubble 1 */}
    <div 
      className="absolute w-32 h-32 rounded-full animate-bubble-1"
      style={{
        background: 'radial-gradient(circle, var(--color-gradient-teal) 0%, transparent 70%)',
        filter: 'blur(30px)',
        opacity: 'var(--opacity-gradient-bubble)',
        animation: 'bubble-float-1 45s ease-in-out infinite, bubble-color-1 45s ease-in-out infinite'
      }}
    />
    
    {/* Bubble 2 */}
    <div 
      className="absolute w-28 h-28 rounded-full animate-bubble-2"
      style={{
        background: 'radial-gradient(circle, var(--color-gradient-purple) 0%, transparent 70%)',
        filter: 'blur(30px)',
        opacity: 'var(--opacity-gradient-bubble)',
        animation: 'bubble-float-2 50s ease-in-out infinite, bubble-color-2 50s ease-in-out infinite'
      }}
    />
    
    {/* Bubble 3 */}
    <div 
      className="absolute w-24 h-24 rounded-full animate-bubble-3"
      style={{
        background: 'radial-gradient(circle, var(--color-gradient-cyan) 0%, transparent 70%)',
        filter: 'blur(25px)',
        opacity: 'var(--opacity-gradient-bubble)',
        animation: 'bubble-float-3 55s ease-in-out infinite, bubble-color-3 55s ease-in-out infinite'
      }}
    />
    
    {/* Bubble 4 */}
    <div 
      className="absolute w-26 h-26 rounded-full animate-bubble-4"
      style={{
        background: 'radial-gradient(circle, var(--color-gradient-mint-light) 0%, transparent 70%)',
        filter: 'blur(30px)',
        opacity: 'var(--opacity-gradient-bubble)',
        animation: 'bubble-float-4 40s ease-in-out infinite, bubble-color-4 40s ease-in-out infinite'
      }}
    />
    
    {/* Bubble 5 */}
    <div 
      className="absolute w-20 h-20 rounded-full animate-bubble-5"
      style={{
        background: 'radial-gradient(circle, var(--color-gradient-emerald-glow) 0%, transparent 70%)',
        filter: 'blur(20px)',
        opacity: 'var(--opacity-gradient-bubble)',
        animation: 'bubble-float-5 60s ease-in-out infinite, bubble-color-5 60s ease-in-out infinite'
      }}
    />
    
    {/* Bubble 6 */}
    <div 
      className="absolute w-22 h-22 rounded-full animate-bubble-6"
      style={{
        background: 'radial-gradient(circle, var(--color-gradient-ocean) 0%, transparent 70%)',
        filter: 'blur(35px)',
        opacity: 'var(--opacity-gradient-bubble)',
        animation: 'bubble-float-6 35s ease-in-out infinite, bubble-color-6 35s ease-in-out infinite'
      }}
    />
  </div>
));

CSSBubbles.displayName = 'CSSBubbles';

// Pure CSS gradient with keyframe animation
const GradientLayer = memo(() => {
  return (
    <div className="absolute inset-0 z-0">
      {/* Multiple gradient layers with different animation timings */}
      <div 
        className="absolute inset-0 animate-gradient-shift-1"
        style={{
          opacity: 'var(--opacity-gradient-background)',
          background: 'radial-gradient(circle at 20% 30%, var(--color-gradient-teal) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--color-gradient-purple) 0%, transparent 50%), radial-gradient(circle at 50% 50%, var(--color-gradient-emerald-glow) 0%, transparent 70%)'
        }}
      />
      <div 
        className="absolute inset-0 animate-gradient-shift-2"
        style={{
          opacity: '0',
          background: 'radial-gradient(circle at 70% 20%, var(--color-gradient-cyan) 0%, transparent 50%), radial-gradient(circle at 30% 80%, var(--color-gradient-mint-light) 0%, transparent 50%), radial-gradient(circle at 50% 50%, var(--color-gradient-ocean) 0%, transparent 70%)'
        }}
      />
      <div 
        className="absolute inset-0 animate-gradient-shift-3"
        style={{
          opacity: '0',
          background: 'radial-gradient(circle at 50% 50%, var(--color-gradient-emerald-glow) 0%, transparent 40%), radial-gradient(circle at 20% 20%, var(--color-gradient-ocean) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-gradient-teal) 0%, transparent 50%)'
        }}
      />
    </div>
  );
});

GradientLayer.displayName = 'GradientLayer';

const AnimatedGradientBackground = ({ className = '', showBubbles = true }: AnimatedGradientBackgroundProps) => {
  return (
    <div 
      className={`fixed inset-0 overflow-hidden ${className}`} 
      style={{ width: '120vw', height: '120vh', left: '-10vw', top: '-10vh' }}
    >
      <GradientLayer />
      {showBubbles && <CSSBubbles />}
    </div>
  );
};

AnimatedGradientBackground.displayName = 'AnimatedGradientBackground';

// Export with strict memo comparison
export default memo(AnimatedGradientBackground, (prevProps, nextProps) => {
  return prevProps.className === nextProps.className && 
         prevProps.showBubbles === nextProps.showBubbles;
});