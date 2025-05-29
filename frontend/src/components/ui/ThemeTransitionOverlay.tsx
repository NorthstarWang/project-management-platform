'use client';

import React from 'react';

interface ThemeTransitionOverlayProps {
  isVisible: boolean;
  targetTheme?: 'light' | 'dark';
  onComplete?: () => void;
}

export function ThemeTransitionOverlay({ 
  isVisible, 
  targetTheme = 'dark', 
  onComplete 
}: ThemeTransitionOverlayProps) {
  const [progress, setProgress] = React.useState(0);
  const [waveProgress, setWaveProgress] = React.useState(0);
  
  // Capture initial themes at the start of animation
  const initialThemes = React.useRef<{
    original: 'light' | 'dark';  // What user was seeing before click
    target: 'light' | 'dark';   // What user will see after transition
    captured: boolean;
  }>({
    original: 'dark',
    target: 'dark',
    captured: false
  });

  React.useEffect(() => {
    if (isVisible && !initialThemes.current.captured) {
      // The original theme is what the user WAS seeing (opposite of target)
      // The target theme is what the user WILL see (what they clicked to switch to)
      initialThemes.current = {
        original: targetTheme, // User wants to switch to this (but we'll show it as original)
        target: targetTheme === 'light' ? 'dark' : 'light', // User was seeing the opposite (but we'll show it as target)
        captured: true
      };
    } else if (!isVisible) {
      initialThemes.current.captured = false;
    }
  }, [isVisible, targetTheme]);

  React.useEffect(() => {
    if (isVisible) {
      setProgress(0);
      setWaveProgress(0);
      
      // Start wave animation immediately
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
            setTimeout(() => {
              onComplete?.();
            }, 200);
            return 100;
          }
          return prev + 1.39; // Same timing as wave
        });
      }, 42);

      return () => {
        clearInterval(waveInterval);
        clearInterval(progressInterval);
      };
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  // Use captured themes - these represent the visual transition the user should see
  const originalTheme = initialThemes.current.captured ? initialThemes.current.original : targetTheme;
  const finalTheme = initialThemes.current.captured ? initialThemes.current.target : (targetTheme === 'light' ? 'dark' : 'light');

  // Hardcoded theme colors
  const lightThemeBackground = '#ECFFFE'; // Morning dew
  const darkThemeBackground = '#0F2830'; // Firefly
  const lightThemeAccent = '#FA7328'; // Orange
  const darkThemeAccent = '#00D37F'; // Green
  const lightThemeTextDark = '#022C10'; // Pine
  const darkThemeTextLight = '#ECFFFE'; // Morning dew
  const lightThemeTextMuted = '#8ba39a';
  const darkThemeTextMuted = '#5a7a6f';

  // Define ORIGINAL (what user was seeing) and FINAL (what user will see) theme colors
  const originalBackground = originalTheme === 'light' ? lightThemeBackground : darkThemeBackground;
  const finalBackground = finalTheme === 'light' ? lightThemeBackground : darkThemeBackground;
  const originalAccent = originalTheme === 'light' ? lightThemeAccent : darkThemeAccent;
  const finalAccent = finalTheme === 'light' ? lightThemeAccent : darkThemeAccent;
  const originalContrastBackground = originalTheme === 'light' ? lightThemeTextDark : darkThemeTextLight;
  const finalContrastBackground = finalTheme === 'light' ? lightThemeTextDark : darkThemeTextLight;
  const originalMutedText = originalTheme === 'light' ? lightThemeTextMuted : darkThemeTextMuted;
  const finalMutedText = finalTheme === 'light' ? lightThemeTextMuted : darkThemeTextMuted;

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
  const currentAccentColor = interpolateColor(originalAccent, finalAccent, transitionFactor);
  const currentContrastColor = interpolateColor(originalContrastBackground, finalContrastBackground, transitionFactor);
  const currentMutedColor = interpolateColor(originalMutedText, finalMutedText, transitionFactor);

  return (
    <div 
      className="fixed inset-0 overflow-hidden" 
      style={{ 
        width: '100vw', 
        height: '100vh',
        zIndex: 9999
      }}
    >
      {/* Base Background - Show final theme background */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundColor: finalBackground
        }}
      />

      {/* Wave Transition Effect - From ORIGINAL theme to FINAL theme */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: `
            linear-gradient(
              135deg,
              ${originalBackground} 0%,
              ${originalBackground} ${Math.max(0, wavePosition - 40)}%,
              ${originalAccent} ${Math.max(0, wavePosition - 20)}%,
              ${finalAccent} ${Math.min(100, wavePosition)}%,
              ${finalBackground} ${Math.min(100, wavePosition + 20)}%,
              ${finalBackground} ${Math.min(100, wavePosition + 40)}%,
              ${finalBackground} 100%
            )
          `,
          transition: 'background 0.1s ease-out'
        }}
      />

      {/* Loader Content - Gradually transitioning colors */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 10 }}
      >
        <div 
          className="flex flex-col items-center"
          style={{ gap: '1.5rem' }}
        >
          {/* Circular Progress with Enhanced Backdrop */}
          <div className="relative">
            {/* Enhanced backdrop for contrast */}
            <div 
              className="absolute rounded-full"
              style={{
                width: '140px',
                height: '140px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
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
              className="absolute rounded-full animate-pulse"
              style={{
                width: '120px',
                height: '120px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, 
                  ${currentAccentColor}66 0%, 
                  ${currentAccentColor}33 40%, 
                  transparent 70%
                )`,
                filter: 'blur(8px)',
                animationDuration: '2s',
                opacity: 0.4
              }}
            />

            {/* Middle Aura */}
            <div 
              className="absolute rounded-full animate-pulse"
              style={{
                width: '90px',
                height: '90px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, 
                  ${currentAccentColor}99 0%, 
                  ${currentAccentColor}4D 50%, 
                  transparent 70%
                )`,
                filter: 'blur(4px)',
                animationDuration: '1.5s',
                animationDelay: '0.3s',
                opacity: 0.6
              }}
            />

            {/* Inner Aura */}
            <div 
              className="absolute rounded-full"
              style={{
                width: '70px',
                height: '70px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
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
              className="relative rounded-full"
              style={{
                width: '64px',
                height: '64px',
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
                className="absolute inset-0"
                width="64"
                height="64"
                viewBox="0 0 64 64"
                style={{ transform: 'rotate(-90deg)' }}
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
                className="absolute inset-0 flex items-center justify-center"
                style={{
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
            className="text-center rounded-xl"
            style={{
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
                color: currentAccentColor,
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                transition: 'color 0.1s ease-out'
              }}
            >
              Switching to {originalTheme === 'light' ? 'Light' : 'Dark'} Theme
            </h3>
            <p 
              style={{
                fontSize: '14px',
                color: `${currentAccentColor}CC`,
                transition: 'color 0.1s ease-out'
              }}
            >
              Updating interface colors...
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex" style={{ gap: '8px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-full animate-pulse"
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: currentAccentColor,
                  animationDelay: `${i * 300}ms`,
                  animationDuration: '1.2s',
                  filter: `drop-shadow(0 0 6px ${currentAccentColor}CC)`,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'background-color 0.1s ease-out'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemeTransitionOverlay; 