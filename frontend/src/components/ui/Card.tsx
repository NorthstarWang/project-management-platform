'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-card border-card shadow-card',
        flat: 'bg-secondary border-secondary',
        ghost: 'bg-transparent border-muted',
        outline: 'bg-transparent border-primary',
        elevated: 'bg-card border-card shadow-lg hover:shadow-xl',
        interactive: 'bg-card border-card hover:bg-card-hover cursor-pointer',
      },
      size: {
        sm: 'p-3',
        default: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-lg hover:-translate-y-1',
        glow: 'hover:shadow-xl hover:border-accent',
        scale: 'hover:scale-105',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      hover: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, hover, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(cardVariants({ variant, size, hover, className }))}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
      {...(props as any)}
    />
  )
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, delay: 0.1 }}
    layout
    {...(props as any)}
  />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-primary',
      className
    )}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-secondary', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <motion.div 
    ref={ref} 
    className={cn('pt-0', className)} 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2, delay: 0.2 }}
    layout
    {...(props as any)} 
  />
));

CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants 
}; 