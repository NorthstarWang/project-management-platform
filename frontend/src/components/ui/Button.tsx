'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles using theme-aware classes
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-btn-primary text-btn-primary hover:bg-btn-primary-hover hover:scale-105 hover:shadow-lg active:bg-btn-primary-active active:scale-95 disabled:bg-btn-primary-disabled disabled:text-white/50 focus-visible:ring-accent',
        secondary: 'bg-btn-secondary text-btn-secondary border border-btn-secondary hover:bg-btn-secondary-hover hover:scale-105 hover:shadow-md active:bg-btn-secondary-active active:scale-95 focus-visible:ring-accent',
        ghost: 'bg-transparent text-primary hover:bg-btn-ghost-hover hover:scale-105 active:bg-btn-ghost-active active:scale-95 focus-visible:ring-accent',
        outline: 'border border-secondary bg-transparent hover:bg-interactive-secondary-hover hover:scale-105 hover:shadow-md text-primary active:scale-95 disabled:border-secondary/50 disabled:text-primary/50 focus-visible:ring-accent',
        destructive: 'bg-error text-white hover:bg-red-600 hover:scale-105 hover:shadow-lg active:bg-red-700 active:scale-95 focus-visible:ring-red-500',
        link: 'text-accent underline-offset-4 hover:underline hover:scale-105 p-0 h-auto active:scale-95 focus-visible:ring-accent',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-11 px-8',
        xl: 'h-12 px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }
    
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        whileHover={disabled || loading ? {} : { scale: 1.05 }}
        whileTap={disabled || loading ? {} : { scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: disabled || loading ? 0.5 : 1, 
          scale: 1 
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        layout
        {...(props as any)}
      >
        {loading && (
          <motion.svg
            className="mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </motion.svg>
        )}
        {!loading && leftIcon && (
          <motion.span 
            className="mr-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: disabled || loading ? 0.5 : 1, 
              x: 0 
            }}
            transition={{ delay: 0.1 }}
          >
            {leftIcon}
          </motion.span>
        )}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: disabled || loading ? 0.5 : 1 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.span>
        {!loading && rightIcon && (
          <motion.span 
            className="ml-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ 
              opacity: disabled || loading ? 0.5 : 1, 
              x: 0 
            }}
            transition={{ delay: 0.1 }}
          >
            {rightIcon}
          </motion.span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants }; 