'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader } from './Card';
import { Badge, StatusBadge, PriorityBadge } from './Badge';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { MoreHorizontal, Calendar, MessageSquare, Paperclip } from 'lucide-react';

export interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  commentsCount?: number;
  attachmentsCount?: number;
  tags?: string[];
  className?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onAssign?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function TaskCard({
  id,
  title,
  description,
  status,
  priority,
  assignee,
  dueDate,
  createdAt,
  updatedAt,
  commentsCount = 0,
  attachmentsCount = 0,
  tags = [],
  className,
  onClick,
  onEdit,
  onDelete,
  onMove,
  onAssign,
  showActions = true,
  compact = false,
}: TaskCardProps) {
  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const isDueSoon = dueDate && new Date(dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

  const getTagVariant = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('frontend')) return 'frontend';
    if (tagLower.includes('backend')) return 'backend';
    if (tagLower.includes('auth')) return 'auth';
    if (tagLower.includes('urgent')) return 'urgent';
    if (tagLower.includes('documentation') || tagLower.includes('docs')) return 'documentation';
    if (tagLower.includes('design')) return 'design';
    return 'outline';
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 hover-lift',
        'bg-card-content border-card-content hover:bg-card-hover hover:border-accent',
        compact ? 'p-3' : 'p-4',
        className
      )}
      onClick={onClick}
      data-testid={`task-card-${id}`}
    >
      <CardHeader className={cn('pb-2', compact && 'pb-1')}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'font-medium text-primary leading-tight',
              compact ? 'text-sm' : 'text-base',
              'line-clamp-2'
            )}>
              {title}
            </h4>
            {description && !compact && (
              <p className="text-sm text-secondary mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          
          {showActions && (
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 -mr-2"
              onClick={(e) => {
                e.stopPropagation();
                // For now, just call the first available action
                if (onEdit) onEdit();
                else if (onMove) onMove();
                else if (onAssign) onAssign();
                else if (onDelete) onDelete();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Task actions</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status and Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={status} size="sm">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </StatusBadge>
          
          {priority && (
            <PriorityBadge priority={priority} size="sm">
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </PriorityBadge>
          )}
          
          {isOverdue && (
            <Badge variant="error" size="sm">
              Overdue
            </Badge>
          )}
          
          {isDueSoon && !isOverdue && (
            <Badge variant="warning" size="sm">
              Due Soon
            </Badge>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && !compact && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => {
              const variant = getTagVariant(tag);
              return (
                <Badge 
                  key={tag} 
                  variant={variant as any} 
                  size="sm" 
                  className={cn(
                    'text-xs',
                    variant === 'frontend' && 'bg-tag-frontend text-tag-frontend border-tag-frontend',
                    variant === 'backend' && 'bg-tag-backend text-tag-backend border-tag-backend',
                    variant === 'auth' && 'bg-tag-auth text-tag-auth border-tag-auth',
                    variant === 'urgent' && 'bg-tag-urgent text-tag-urgent border-tag-urgent',
                    variant === 'documentation' && 'bg-tag-documentation text-tag-documentation border-tag-documentation',
                    variant === 'design' && 'bg-tag-design text-tag-design border-tag-design'
                  )}
                >
                  {tag}
                </Badge>
              );
            })}
            {tags.length > 3 && (
              <Badge variant="outline" size="sm" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Assignee */}
          <div className="flex items-center">
            {assignee ? (
              <Avatar
                size="sm"
                name={assignee.name}
                src={assignee.avatar}
                className="mr-2"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-surface border-2 border-dashed border-secondary flex items-center justify-center mr-2">
                <span className="text-xs text-muted">?</span>
              </div>
            )}
            <span className="text-xs text-secondary">
              {assignee?.name || 'Unassigned'}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-muted">
            {/* Due Date */}
            {dueDate && (
              <div className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-500',
                isDueSoon && !isOverdue && 'text-yellow-600'
              )}>
                <Calendar className="h-3 w-3" />
                <span>{new Date(dueDate).toLocaleDateString()}</span>
              </div>
            )}

            {/* Comments */}
            {commentsCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{commentsCount}</span>
              </div>
            )}

            {/* Attachments */}
            {attachmentsCount > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span>{attachmentsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        {(updatedAt || createdAt) && !compact && (
          <div className="text-xs text-muted">
            {updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : `Created ${formatRelativeTime(createdAt!)}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for lists
export function CompactTaskCard(props: TaskCardProps) {
  return <TaskCard {...props} compact={true} />;
}

// Task card skeleton for loading states
export function TaskCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={cn('animate-pulse', compact ? 'p-3' : 'p-4')}>
      <CardHeader className={cn('pb-2', compact && 'pb-1')}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface rounded w-3/4"></div>
            {!compact && <div className="h-3 bg-surface rounded w-1/2"></div>}
          </div>
          <div className="h-8 w-8 bg-surface rounded"></div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="h-5 bg-surface rounded-full w-16"></div>
          <div className="h-5 bg-surface rounded-full w-12"></div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-surface rounded-full mr-2"></div>
            <div className="h-3 bg-surface rounded w-20"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-3 bg-surface rounded w-12"></div>
            <div className="h-3 bg-surface rounded w-8"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 