'use client';

import React from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  rectIntersection,
  getFirstCollision,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type UniqueIdentifier,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// Custom collision detection for nested droppables
const customCollisionDetection: CollisionDetection = (args) => {
  // Start by finding any intersecting droppable
  const pointerIntersections = pointerWithin(args);
  const intersections = pointerIntersections.length > 0 
    ? pointerIntersections 
    : rectIntersection(args);

  let overId = getFirstCollision(intersections, 'id');

  if (overId != null) {
    const overContainer = args.droppableContainers.find(container => container.id === overId);
    
    if (overContainer) {
      // If the over item is a container, find the closest item within it
      const containerItems = args.droppableContainers
        .filter((container) => 
          container.id !== overId && 
          container.data.current?.parent === overId
        );

      if (containerItems.length > 0) {
        overId = closestCenter({
          ...args,
          droppableContainers: containerItems,
        })[0]?.id;
      }
    }
  }

  return overId ? [{ id: overId }] : [];
};

// DndProvider component
export interface DndProviderProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  collisionDetection?: CollisionDetection;
}

export function DndProvider({
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  collisionDetection = customCollisionDetection,
}: DndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  );
}

// Droppable container component
export interface DroppableProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
  className?: string;
  data?: Record<string, any>;
  disabled?: boolean;
}

export function Droppable({ 
  id, 
  children, 
  className, 
  data
}: DroppableProps) {
  return (
    <div
      id={String(id)}
      className={cn(
        'min-h-[100px] transition-colors duration-200',
        'dnd-drop-zone',
        className
      )}
      data-droppable-id={id}
      data-droppable-data={JSON.stringify(data)}
    >
      {children}
    </div>
  );
}

// Sortable container component
export interface SortableContainerProps {
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  children: React.ReactNode;
  className?: string;
  strategy?: typeof verticalListSortingStrategy | typeof horizontalListSortingStrategy | typeof rectSortingStrategy;
  disabled?: boolean;
}

export function SortableContainer({
  id,
  items,
  children,
  className,
  strategy = verticalListSortingStrategy,
  disabled = false,
}: SortableContainerProps) {
  return (
    <SortableContext id={String(id)} items={items} strategy={strategy} disabled={disabled}>
      <div className={cn('space-y-2', className)}>
        {children}
      </div>
    </SortableContext>
  );
}

// Sortable item component
export interface SortableItemProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
  className?: string;
  data?: Record<string, any>;
  disabled?: boolean;
  handle?: boolean;
}

export function SortableItem({
  id,
  children,
  className,
  data,
  disabled = false,
  handle = false,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    isSorting,
  } = useSortable({
    id,
    data,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'z-50 opacity-50',
        isOver && 'ring-2 ring-accent ring-opacity-50',
        isSorting && 'transition-transform duration-200',
        className
      )}
      {...(handle ? {} : { ...attributes, ...listeners })}
    >
      {children}
      {handle && (
        <div
          className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/10"
          {...attributes}
          {...listeners}
        >
          <svg
            className="h-4 w-4 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// Drag overlay component for visual feedback
export interface DragOverlayWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function DragOverlayWrapper({ children, className }: DragOverlayWrapperProps) {
  return (
    <DragOverlay
      className={cn('dnd-overlay', className)}
      dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
    >
      {children}
    </DragOverlay>
  );
}

// Task card component for Kanban boards
export interface DraggableTaskCardProps {
  id: UniqueIdentifier;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'progress' | 'review' | 'done';
  assignee?: {
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  className?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function DraggableTaskCard({
  id,
  title,
  description,
  priority,
  assignee,
  dueDate,
  className,
  onClick,
}: DraggableTaskCardProps) {
  return (
    <SortableItem id={id} className={className}>
      <div
        className={cn(
          'card-elevated p-3 cursor-pointer select-none',
          'hover:shadow-md transition-all duration-200',
          className
        )}
        onClick={onClick}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="text-sm font-medium text-primary line-clamp-2">
              {title}
            </h4>
            {priority && (
              <span className={cn(
                'px-2 py-1 text-xs rounded-full',
                priority === 'low' && 'bg-priority-low text-priority-low border-priority-low',
                priority === 'medium' && 'bg-priority-medium text-priority-medium border-priority-medium',
                priority === 'high' && 'bg-priority-high text-priority-high border-priority-high',
                priority === 'urgent' && 'bg-priority-urgent text-priority-urgent border-priority-urgent'
              )}>
                {priority}
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-secondary line-clamp-2">
              {description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            {assignee && (
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-full bg-surface flex items-center justify-center text-xs font-medium">
                  {assignee.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-secondary">
                  {assignee.name}
                </span>
              </div>
            )}
            
            {dueDate && (
              <span className="text-xs text-muted">
                {new Date(dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </SortableItem>
  );
}

// Kanban list component
export interface KanbanListProps {
  id: UniqueIdentifier;
  title: string;
  items: UniqueIdentifier[];
  children: React.ReactNode;
  className?: string;
  onAddItem?: () => void;
}

export function KanbanList({
  id,
  title,
  items,
  children,
  className,
  onAddItem,
}: KanbanListProps) {
  return (
    <div className={cn('flex flex-col w-80 bg-secondary rounded-lg', className)}>
      <div className="flex items-center justify-between p-4 border-b border-muted">
        <h3 className="font-medium text-primary">{title}</h3>
        <span className="text-sm text-muted">{items.length}</span>
      </div>
      
      <Droppable id={id} className="flex-1 p-2">
        <SortableContainer id={id} items={items} className="space-y-2">
          {children}
        </SortableContainer>
        
        {onAddItem && (
          <button
            onClick={onAddItem}
            className="w-full mt-2 p-2 text-sm text-secondary hover:text-primary hover:bg-surface rounded-md transition-colors"
          >
            + Add a card
          </button>
        )}
      </Droppable>
    </div>
  );
}

export {
  DndContext,
  DragOverlay,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
}; 