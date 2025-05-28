'use client';

import React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { generateInitials } from '@/lib/utils';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full border-2 border-primary',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-20 w-20 text-xl',
      },
      variant: {
        default: 'bg-surface',
        primary: 'bg-interactive-primary text-on-accent',
        secondary: 'bg-secondary text-primary',
        accent: 'bg-accent text-on-accent',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

const avatarImageVariants = cva(
  'aspect-square h-full w-full object-cover'
);

const avatarFallbackVariants = cva(
  'flex h-full w-full items-center justify-center font-medium text-primary bg-surface'
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  name?: string;
  showBorder?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ 
  className, 
  size, 
  variant, 
  src, 
  alt, 
  fallback, 
  name, 
  showBorder = true,
  status,
  ...props 
}, ref) => {
  const initials = fallback || (name ? generateInitials(name) : '?');
  
  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          avatarVariants({ size, variant }),
          !showBorder && 'border-0',
          className
        )}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt || name || 'Avatar'}
          className={avatarImageVariants()}
        />
        <AvatarPrimitive.Fallback
          className={avatarFallbackVariants()}
          delayMs={600}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full border-2 border-background transition-all duration-200',
            size === 'xs' && 'h-2 w-2',
            size === 'sm' && 'h-2.5 w-2.5',
            size === 'default' && 'h-3 w-3',
            size === 'lg' && 'h-3.5 w-3.5',
            size === 'xl' && 'h-4 w-4',
            size === '2xl' && 'h-5 w-5',
            status === 'online' && 'bg-status-online',
            status === 'offline' && 'bg-status-offline',
            status === 'away' && 'bg-status-away',
            status === 'busy' && 'bg-status-busy'
          )}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

// Avatar Group component for displaying multiple avatars
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  variant?: VariantProps<typeof avatarVariants>['variant'];
  spacing?: 'tight' | 'normal' | 'loose';
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 5, size = 'default', variant = 'default', spacing = 'normal', children, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const visibleChildren = max ? childrenArray.slice(0, max) : childrenArray;
    const hiddenCount = max ? Math.max(0, childrenArray.length - max) : 0;

    const spacingClasses = {
      tight: '-space-x-1',
      normal: '-space-x-2',
      loose: '-space-x-1',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', spacingClasses[spacing], className)}
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <div key={index} className="relative">
            {React.isValidElement(child) && React.cloneElement(child as React.ReactElement<AvatarProps>, {
              size,
              variant,
              showBorder: true,
              className: cn('ring-2 ring-background', (child.props as AvatarProps).className),
            })}
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <Avatar
            size={size}
            variant="secondary"
            fallback={`+${hiddenCount}`}
            className="ring-2 ring-background"
          />
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup, avatarVariants }; 