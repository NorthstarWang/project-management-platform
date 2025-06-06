'use client';

import React, { memo, useId } from 'react';
import { motion } from 'framer-motion';

interface AnimatedGradientBackgroundProps {
  className?: string;
  showBubbles?: boolean;
}

const AnimatedGradientBackground = ({ className = '', showBubbles = true }: AnimatedGradientBackgroundProps) => {
  // Use a stable ID to ensure animations don't reset
  const uniqueId = useId();
  
  return (
    <div className={`fixed inset-0 overflow-hidden ${className}`} data-animated-background={uniqueId} style={{ width: '120vw', height: '120vh', left: '-10vw', top: '-10vh' }}>
      {/* Animated gradient background */}
      <motion.div
        layoutId={`gradient-${uniqueId}`}
        className="absolute inset-0 opacity-20 dark:opacity-100"
        animate={{
          background: [
            'radial-gradient(circle at 30% 30%, var(--color-gradient-teal) 0%, transparent 90%), radial-gradient(circle at 70% 70%, var(--color-gradient-purple) 0%, transparent 90%), var(--background-primary)',
            'radial-gradient(circle at 70% 30%, var(--color-gradient-cyan) 0%, transparent 90%), radial-gradient(circle at 30% 70%, var(--color-gradient-mint-light) 0%, transparent 90%), var(--background-primary)',
            'radial-gradient(circle at 50% 50%, var(--color-gradient-emerald-glow) 0%, transparent 95%), radial-gradient(circle at 50% 50%, var(--color-gradient-ocean) 0%, transparent 85%), var(--background-primary)',
            'radial-gradient(circle at 30% 30%, var(--color-gradient-teal) 0%, transparent 90%), radial-gradient(circle at 70% 70%, var(--color-gradient-purple) 0%, transparent 90%), var(--background-primary)'
          ],
        }}
        transition={{
          duration: 60, // 1 minute for a full cycle
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop"
        }}
      />
      
      {/* Subtle animated bubbles */}
      {showBubbles && (
        <>
          {/* Bubble 1 */}
          <motion.div
            key={`bubble-1-${uniqueId}`}
            layoutId={`bubble-1-${uniqueId}`}
            className="absolute w-32 h-32 rounded-full opacity-30 dark:opacity-100"
            style={{
              background: 'radial-gradient(circle, var(--color-gradient-teal) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
            initial={{
              x: '-10%',
              y: '20%',
              scale: 1,
              opacity: 0
            }}
            animate={{
              x: ['-10%', '110%'],
              y: ['20%', '80%'],
              scale: [1, 1.2, 1],
              opacity: [0, 0.15, 0.15, 0],
            }}
            transition={{
              duration: 25,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              times: [0, 0.1, 0.9, 1],
              delay: 0
            }}
          />
          
          {/* Bubble 2 */}
          <motion.div
            key={`bubble-2-${uniqueId}`}
            layoutId={`bubble-2-${uniqueId}`}
            className="absolute w-28 h-28 rounded-full opacity-30 dark:opacity-100"
            style={{
              background: 'radial-gradient(circle, var(--color-gradient-purple) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
            initial={{
              x: '100%',
              y: '70%',
              scale: 1.1,
              opacity: 0
            }}
            animate={{
              x: ['100%', '-20%', '100%'],
              y: ['70%', '10%', '70%'],
              scale: [1.1, 0.9, 1.1],
              opacity: [0, 0.12, 0.12, 0],
            }}
            transition={{
              duration: 30,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              times: [0, 0.1, 0.9, 1],
              delay: 3
            }}
          />
          
          {/* Bubble 3 */}
          <motion.div
            key={`bubble-3-${uniqueId}`}
            layoutId={`bubble-3-${uniqueId}`}
            className="absolute w-24 h-24 rounded-full opacity-30 dark:opacity-100"
            style={{
              background: 'radial-gradient(circle, var(--color-gradient-cyan) 0%, transparent 70%)',
              filter: 'blur(25px)',
            }}
            initial={{
              x: '50%',
              y: '10%',
              scale: 1,
              opacity: 0
            }}
            animate={{
              x: ['50%', '80%', '20%', '50%'],
              y: ['10%', '60%', '90%', '10%'],
              scale: [1, 1.3, 0.8, 1],
              opacity: [0, 0.1, 0.1, 0],
            }}
            transition={{
              duration: 35,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              times: [0, 0.1, 0.9, 1],
              delay: 6
            }}
          />
          
          {/* Bubble 4 */}
          <motion.div
            key={`bubble-4-${uniqueId}`}
            layoutId={`bubble-4-${uniqueId}`}
            className="absolute w-26 h-26 rounded-full opacity-30 dark:opacity-100"
            style={{
              background: 'radial-gradient(circle, var(--color-gradient-mint-light) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
            initial={{
              x: '10%',
              y: '80%',
              scale: 0.9,
              opacity: 0
            }}
            animate={{
              x: ['10%', '90%', '40%', '10%'],
              y: ['80%', '20%', '50%', '80%'],
              scale: [0.9, 1.1, 1, 0.9],
              opacity: [0, 0.1, 0.1, 0],
            }}
            transition={{
              duration: 40,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              times: [0, 0.1, 0.9, 1],
              delay: 9
            }}
          />
          
          {/* Bubble 5 */}
          <motion.div
            key={`bubble-5-${uniqueId}`}
            layoutId={`bubble-5-${uniqueId}`}
            className="absolute w-20 h-20 rounded-full opacity-30 dark:opacity-100"
            style={{
              background: 'radial-gradient(circle, var(--color-gradient-emerald-glow) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
            initial={{
              x: '80%',
              y: '50%',
              scale: 1.2,
              opacity: 0
            }}
            animate={{
              x: ['80%', '20%', '60%', '80%'],
              y: ['50%', '80%', '20%', '50%'],
              scale: [1.2, 0.8, 1.1, 1.2],
              opacity: [0, 0.12, 0.12, 0],
            }}
            transition={{
              duration: 28,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              times: [0, 0.1, 0.9, 1],
              delay: 12
            }}
          />
          
          {/* Bubble 6 */}
          <motion.div
            key={`bubble-6-${uniqueId}`}
            layoutId={`bubble-6-${uniqueId}`}
            className="absolute w-22 h-22 rounded-full opacity-30 dark:opacity-100"
            style={{
              background: 'radial-gradient(circle, var(--color-gradient-ocean) 0%, transparent 70%)',
              filter: 'blur(35px)',
            }}
            initial={{
              x: '30%',
              y: '40%',
              scale: 1,
              opacity: 0
            }}
            animate={{
              x: ['30%', '70%', '50%', '30%'],
              y: ['40%', '10%', '70%', '40%'],
              scale: [1, 1.2, 0.9, 1],
              opacity: [0, 0.08, 0.08, 0],
            }}
            transition={{
              duration: 32,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
              times: [0, 0.1, 0.9, 1],
              delay: 15
            }}
          />
        </>
      )}
    </div>
  );
};

AnimatedGradientBackground.displayName = 'AnimatedGradientBackground';

// Export with strict memo comparison to prevent unnecessary re-renders
export default memo(AnimatedGradientBackground, (prevProps, nextProps) => {
  // Only re-render if className or showBubbles actually changes
  return prevProps.className === nextProps.className && 
         prevProps.showBubbles === nextProps.showBubbles;
});