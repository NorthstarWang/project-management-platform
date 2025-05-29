import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const skeletonVariants = cva(
  'animate-pulse bg-muted rounded',
  {
    variants: {
      variant: {
        default: 'bg-gray-3',
        light: 'bg-gray-2',
        dark: 'bg-gray-4',
      },
      size: {
        sm: 'h-3',
        md: 'h-4',
        lg: 'h-6',
        xl: 'h-8',
        '2xl': 'h-12',
      },
      shape: {
        rectangle: 'rounded',
        circle: 'rounded-full',
        pill: 'rounded-full',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      shape: 'rectangle',
    },
  }
);

export interface SkeletonProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string;
  height?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, shape, width, height, style, ...props }, ref) => {
    const customStyle = {
      ...style,
      ...(width && { width }),
      ...(height && { height }),
    };

    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, size, shape, className }))}
        style={customStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined skeleton components for common use cases
export const SkeletonText = ({ lines = 1, className, ...props }: { lines?: number } & SkeletonProps) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        size="sm"
        width={i === lines - 1 ? '60%' : '100%'}
        {...props}
      />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = 'md', ...props }: SkeletonProps) => (
  <Skeleton
    shape="circle"
    size={size}
    width={size === 'sm' ? '2rem' : size === 'lg' ? '3rem' : '2.5rem'}
    height={size === 'sm' ? '2rem' : size === 'lg' ? '3rem' : '2.5rem'}
    {...props}
  />
);

export const SkeletonCard = ({ className, ...props }: SkeletonProps) => (
  <div className={cn('space-y-3', className)}>
    <Skeleton height="6rem" {...props} />
    <SkeletonText lines={2} />
  </div>
);

export { Skeleton, skeletonVariants }; 