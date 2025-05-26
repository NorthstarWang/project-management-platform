'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'bg-input border-input text-input placeholder-input rounded-md px-3 py-2 transition-all focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: '',
        ghost: 'bg-transparent border-0 shadow-none',
        filled: 'bg-surface border-muted',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
              state: {
        default: '',
        error: 'border-input-error focus:border-input-error',
        success: 'border-success focus:border-success',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    state, 
    type = 'text',
    leftIcon,
    rightIcon,
    error,
    helperText,
    ...props 
  }, ref) => {
    const hasError = error || state === 'error';
    const finalState = hasError ? 'error' : state;

    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, size, state: finalState }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {rightIcon}
            </div>
          )}
          {(error || helperText) && (
            <p className={cn(
              'mt-1 text-xs',
              hasError ? 'text-error' : 'text-muted'
            )}>
              {error || helperText}
            </p>
          )}
        </div>
      );
    }

    return (
      <div>
        <input
          type={type}
          className={cn(inputVariants({ variant, size, state: finalState, className }))}
          ref={ref}
          {...props}
        />
        {(error || helperText) && (
          <p className={cn(
            'mt-1 text-xs',
            hasError ? 'text-error' : 'text-muted'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants }; 