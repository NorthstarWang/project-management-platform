'use client';

import React, { memo } from 'react';

interface DashboardGradientBackgroundProps {
  className?: string;
}

// Subtle gradient background for dashboard pages
const DashboardGradientBackground = memo(({ className = '' }: DashboardGradientBackgroundProps) => {
  return (
    <div className={`fixed inset-0 overflow-hidden ${className}`}>
      {/* Multiple gradient layers with very subtle opacity */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 animate-gradient-shift-1"
          style={{
            opacity: 'var(--opacity-gradient-dashboard)',
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
      
      {/* Heavy blur overlay to make it extremely subtle */}
      <div className="absolute inset-0 backdrop-blur-3xl" />
    </div>
  );
});

DashboardGradientBackground.displayName = 'DashboardGradientBackground';

export default DashboardGradientBackground;