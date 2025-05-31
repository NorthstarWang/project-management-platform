'use client';

import React from 'react';

interface ThemeTransitionOverlayProps {
  isVisible: boolean;
  targetTheme?: 'light' | 'dark';
  onComplete?: () => void;
}

// Pre-defined theme colors (not dependent on CSS variables)
const THEME_COLORS = {
  dark: {
    background: '#0F2830', // Firefly
    accent: '#00D37F', // Green
    contrast: '#ECFFFE', // Morning dew
    muted: '#5a7a6f'
  },
  light: {
    background: '#ECFFFE', // Morning dew
    accent: '#FA7328', // Orange
    contrast: '#022C10', // Pine
    muted: '#8ba39a'
  }
} as const;

export function ThemeTransitionOverlay({ 
  isVisible, 
  targetTheme = 'dark', 
  onComplete 
}: ThemeTransitionOverlayProps) {
  const [progress, setProgress] = React.useState(0);
  const [waveProgress, setWaveProgress] = React.useState(0);
  const [fadeOpacity, setFadeOpacity] = React.useState(0);
  
  // Capture initial themes at the start of animation
  const initialThemes = React.useRef<{
    original: 'light' | 'dark';  // What user is currently seeing
    target: 'light' | 'dark';   // What user wants to switch to
    captured: boolean;
  }>({
    original: 'dark',
    target: 'dark',
    captured: false
  });

  React.useEffect(() => {
    if (isVisible && !initialThemes.current.captured) {
      // Get the actual current theme from DOM or localStorage
      let currentTheme: 'light' | 'dark' = 'dark';
      
      try {
        // First try to get from localStorage
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          currentTheme = savedTheme;
        } else {
          // Fallback: check DOM attribute
          const hasLightTheme = document.documentElement.hasAttribute('data-theme') && 
                                document.documentElement.getAttribute('data-theme') === 'light';
          currentTheme = hasLightTheme ? 'light' : 'dark';
        }
      } catch {
        // Fallback to dark if detection fails
        currentTheme = 'dark';
      }
      
      initialThemes.current = {
        original: targetTheme,  // What user is currently seeing
        target: currentTheme,     // What user wants to switch to
        captured: true
      };
      
      // Reset all progress states
      setProgress(0);
      setWaveProgress(0);
      setFadeOpacity(0);
    } else if (!isVisible) {
      initialThemes.current.captured = false;
      setProgress(0);
      setWaveProgress(0);
      setFadeOpacity(0);
    }
  }, [isVisible, targetTheme]);

  React.useEffect(() => {
    if (isVisible) {
      // Start with fade-in effect
      const fadeInTimeout = setTimeout(() => {
        setFadeOpacity(1);
      }, 50);
      
      // Start wave animation after fade-in
      const startAnimationTimeout = setTimeout(() => {
        const waveInterval = setInterval(() => {
          setWaveProgress(prev => {
            if (prev >= 100) {
              clearInterval(waveInterval);
              return 100;
            }
            return prev + 1.39; // Smooth wave over 3 seconds
          });
        }, 42);

        // Start progress animation
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              
              // Start fade-out effect
              setTimeout(() => {
                setFadeOpacity(0);
              }, 100);
              
              // Complete transition after fade-out
              setTimeout(() => {
                onComplete?.();
              }, 400);
              return 100;
            }
            return prev + 1.39; // Same timing as wave
          });
        }, 42);

        return () => {
          clearInterval(waveInterval);
          clearInterval(progressInterval);
        };
      }, 200); // Delay start of animation for smooth fade-in

      return () => {
        clearTimeout(fadeInTimeout);
        clearTimeout(startAnimationTimeout);
      };
    }
  }, [isVisible, onComplete]);

  if (!isVisible) {
    return null;
  }

  // Use captured themes - get actual current theme vs target theme
  const originalTheme = initialThemes.current.captured ? initialThemes.current.original : 'dark';
  const finalTheme = initialThemes.current.captured ? initialThemes.current.target : targetTheme;

  // Get pre-defined colors for original and final themes
  const originalColors = THEME_COLORS[originalTheme];
  const finalColors = THEME_COLORS[finalTheme];

  // Calculate wave position for visual effect (diagonal sweep from bottom-right to top-left)
  const wavePosition = waveProgress * 1.5;

  // Helper function to interpolate between two hex colors
  const interpolateColor = (color1: string, color2: string, factor: number) => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Calculate transition factor based on wave progress (0 = original theme, 1 = final theme)
  const transitionFactor = waveProgress / 100;

  // Interpolated colors for center components (transition from original to final)
  const currentAccentColor = interpolateColor(originalColors.accent, finalColors.accent, transitionFactor);
  const currentContrastColor = interpolateColor(originalColors.contrast, finalColors.contrast, transitionFactor);
  const currentMutedColor = interpolateColor(originalColors.muted, finalColors.muted, transitionFactor);

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        width: '100vw', 
        height: '100vh',
        zIndex: 99999,
        opacity: fadeOpacity,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      {/* Base Background - Show final theme background */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          backgroundColor: finalColors.background
        }}
      />

      {/* Wave Transition Effect - From ORIGINAL theme to FINAL theme */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background: `
            linear-gradient(
              135deg,
              ${originalColors.background} 0%,
              ${originalColors.background} ${Math.max(0, wavePosition - 40)}%,
              ${originalColors.accent} ${Math.max(0, wavePosition - 20)}%,
              ${finalColors.accent} ${Math.min(100, wavePosition)}%,
              ${finalColors.background} ${Math.min(100, wavePosition + 20)}%,
              ${finalColors.background} ${Math.min(100, wavePosition + 40)}%,
              ${finalColors.background} 100%
            )
          `,
          transition: 'background 0.1s ease-out'
        }}
      />

      {/* Loader Content - Gradually transitioning colors */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10 
        }}
      >
        <div 
          style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem' 
          }}
        >
          {/* Circular Progress with Enhanced Backdrop */}
          <div style={{ position: 'relative' }}>
            {/* Enhanced backdrop for contrast */}
            <div 
              style={{
                position: 'absolute',
                width: '140px',
                height: '140px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(circle, 
                  ${currentContrastColor}CC 0%, 
                  ${currentContrastColor}66 50%, 
                  transparent 70%
                )`,
                filter: 'blur(4px)'
              }}
            />

            {/* Outer Aura */}
            <div 
              style={{
                position: 'absolute',
                width: '120px',
                height: '120px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(circle, 
                  ${currentAccentColor}66 0%, 
                  ${currentAccentColor}33 40%, 
                  transparent 70%
                )`,
                filter: 'blur(8px)',
                animation: 'pulse 2s ease-in-out infinite',
                opacity: 0.4
              }}
            />

            {/* Middle Aura */}
            <div 
              style={{
                position: 'absolute',
                width: '90px',
                height: '90px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(circle, 
                  ${currentAccentColor}99 0%, 
                  ${currentAccentColor}4D 50%, 
                  transparent 70%
                )`,
                filter: 'blur(4px)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: '0.3s',
                opacity: 0.6
              }}
            />

            {/* Inner Aura */}
            <div 
              style={{
                position: 'absolute',
                width: '70px',
                height: '70px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: `radial-gradient(circle, 
                  ${currentAccentColor}CC 0%, 
                  ${currentAccentColor}66 60%, 
                  transparent 80%
                )`,
                filter: 'blur(2px)',
                opacity: 0.8
              }}
            />

            {/* Main Progress Circle */}
            <div 
              style={{
                position: 'relative',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: `${currentContrastColor}E6`,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: `${currentAccentColor}80`,
                backdropFilter: 'blur(4px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.1s ease-out'
              }}
            >
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  transform: 'rotate(-90deg)'
                }}
                width="64"
                height="64"
                viewBox="0 0 64 64"
              >
                {/* Background circle */}
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke={currentMutedColor}
                  strokeWidth="3"
                  opacity="0.4"
                  style={{ transition: 'stroke 0.1s ease-out' }}
                />
                {/* Progress circle */}
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke={currentAccentColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={163.36}
                  strokeDashoffset={163.36 - (163.36 * progress) / 100}
                  style={{
                    filter: `drop-shadow(0 0 4px ${currentAccentColor}CC)`,
                    transition: 'stroke 0.1s ease-out'
                  }}
                />
              </svg>
              {/* Progress text */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: currentAccentColor,
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                  transition: 'color 0.1s ease-out'
                }}
              >
                {Math.round(progress)}%
              </div>
            </div>
          </div>

          {/* Loading text with enhanced backdrop */}
          <div 
            style={{
              textAlign: 'center',
              borderRadius: '12px',
              padding: '1.5rem',
              backgroundColor: `${currentContrastColor}D9`,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: `${currentAccentColor}4D`,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.1s ease-out'
            }}
          >
            <h3 
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '8px',
                margin: '0 0 8px 0',
                color: currentAccentColor,
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                transition: 'color 0.1s ease-out'
              }}
            >
              Switching to {finalTheme === 'light' ? 'Dark' : 'Light'} Theme
            </h3>
            <p 
              style={{
                fontSize: '14px',
                margin: 0,
                color: `${currentAccentColor}CC`,
                transition: 'color 0.1s ease-out'
              }}
            >
              Updating interface colors...
            </p>
          </div>

          {/* Animated dots */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: currentAccentColor,
                  animation: 'pulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 300}ms`,
                  filter: `drop-shadow(0 0 6px ${currentAccentColor}CC)`,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'background-color 0.1s ease-out'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CSS Keyframes for animations - completely isolated */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}

export default ThemeTransitionOverlay; 