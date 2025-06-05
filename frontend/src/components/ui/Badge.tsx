'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-primary border-secondary',
        // Status variants
        todo: 'bg-status-todo text-status-todo border-status-todo',
        progress: 'bg-status-progress text-status-progress border-status-progress',
        review: 'bg-status-review text-status-review border-status-review',
        done: 'bg-status-done text-status-done border-status-done',
        // Priority variants
        low: 'bg-priority-low text-priority-low border-priority-low',
        medium: 'bg-priority-medium text-priority-medium border-priority-medium',
        high: 'bg-priority-high text-priority-high border-priority-high',
        urgent: 'bg-priority-urgent text-priority-urgent border-priority-urgent',
        // Role variants
        admin: 'bg-tag-design text-tag-design border-tag-design',
        manager: 'bg-tag-backend text-tag-backend border-tag-backend',
        member: 'bg-accent-10 text-primary border-secondary',
        // Notification variants
        success: 'bg-success text-success border-success',
        warning: 'bg-warning text-warning border-warning',
        error: 'bg-error-disabled text-error border-error',
        info: 'bg-info text-info border-info',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, removable, onRemove, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {removable && (
        <button
          type="button"
          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-offset-2"
          onClick={onRemove}
        >
          <span className="sr-only">Remove</span>
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
);

Badge.displayName = 'Badge';

// Specialized badge components for common use cases
const StatusBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'> & { status: 'todo' | 'progress' | 'review' | 'done' }>(
  ({ status, ...props }, ref) => (
    <Badge ref={ref} variant={status} {...props} />
  )
);

StatusBadge.displayName = 'StatusBadge';

const PriorityBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'> & { priority: 'low' | 'medium' | 'high' | 'urgent' }>(
  ({ priority, ...props }, ref) => (
    <Badge ref={ref} variant={priority} {...props} />
  )
);

PriorityBadge.displayName = 'PriorityBadge';

const RoleBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'> & { role: 'admin' | 'manager' | 'member' }>(
  ({ role, ...props }, ref) => (
    <Badge ref={ref} variant={role} {...props} />
  )
);

RoleBadge.displayName = 'RoleBadge';

export { Badge, StatusBadge, PriorityBadge, RoleBadge, badgeVariants }; 