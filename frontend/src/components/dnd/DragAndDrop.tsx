'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useDroppable } from '@dnd-kit/react';
import { CollisionPriority } from '@dnd-kit/abstract';
import { move } from '@dnd-kit/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

// Types for our drag and drop system
interface Task {
  id: string;
  title: string;
  description: string;
  list_id: string;
  assignee_id?: string;
  assignee_name?: string;
  priority: string;
  status: string;
  task_type?: string;
  due_date?: string;
  position: number;
  created_at: string;
  comments_count?: number;
  attachments_count?: number;
}

interface List {
  id: string;
  name: string;
  board_id: string;
  position: number;
  created_at: string;
}

// Define default board statuses for new kanban design (fallback)
const DEFAULT_BOARD_STATUSES = [
  { id: 'backlog', name: 'Backlog', color: '#6B7280', position: 0 },
  { id: 'todo', name: 'To Do', color: '#3B82F6', position: 1 },
  { id: 'in_progress', name: 'In Progress', color: '#F59E0B', position: 2 },
  { id: 'review', name: 'Review', color: '#8B5CF6', position: 3 },
  { id: 'done', name: 'Done', color: '#10B981', position: 4 },
  { id: 'archived', name: 'Archived', color: '#9CA3AF', position: 5 },
  { id: 'deleted', name: 'Deleted', color: '#EF4444', position: 6 }
];

// Helper function to calculate luminance
const getLuminance = (hex: string): number => {
  // Remove # if present
  const color = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16) / 255;
  const g = parseInt(color.substr(2, 2), 16) / 255;
  const b = parseInt(color.substr(4, 2), 16) / 255;
  
  // Calculate relative luminance
  const toLinear = (val: number) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };
  
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

// Helper function to get contrast-aware colors
const getContrastColors = (backgroundColor: string) => {
  const luminance = getLuminance(backgroundColor);
  const isDark = luminance < 0.5;
  
  return {
    // For the task count badge
    badgeBackground: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    badgeBorder: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    badgeText: isDark ? '#ffffff' : '#000000',
    // For header text (already white, but could be customized)
    headerText: '#ffffff'
  };
};

// Helper function for analytics tracking
const trackEvent = async (actionType: string, payload: any) => {
  if (typeof window !== 'undefined') {
    try {
      const { track } = await import('@/services/analyticsLogger');
      track(actionType, payload);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

// Get color for task type
const getTaskTypeColor = (taskType?: string): string => {
  switch (taskType?.toLowerCase()) {
    case 'feature': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'bug': return 'bg-red-100 text-red-800 border-red-200';
    case 'research': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'fix': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'story': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Draggable Task Card Component
interface DraggableTaskProps {
  task: Task;
  index: number;
  children: React.ReactNode;
  onTaskClick: (task: Task) => void;
}

function DraggableTask({ task, index, children, onTaskClick }: DraggableTaskProps) {
  const { ref, isDragging } = useSortable({
    id: task.id,
    index,
    type: 'item',
    accept: 'item',
    group: task.status
  });

  return (
    <div
      ref={ref}
      className="cursor-pointer"
      data-testid={`draggable-task-${task.id}`}
      data-dragging={isDragging}
      onClick={() => onTaskClick(task)}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {children}
    </div>
  );
}

// Droppable Status Column Component
interface DroppableStatusColumnProps {
  status: { id: string; name: string; color: string; position: number };
  children: React.ReactNode;
  tasks: Task[];
  onAddTask?: () => void;
  isVisible?: boolean;
  isDragging?: boolean;
  hasOptimisticItems?: boolean;
  listId?: string;
}

function DroppableStatusColumn({ status, children, tasks, onAddTask, isVisible = true, isDragging = false, hasOptimisticItems = false, listId }: DroppableStatusColumnProps) {
  const { ref } = useDroppable({
    id: status.id,
    type: 'column',
    accept: 'item',
    collisionPriority: CollisionPriority.Low,
  });

  if (!isVisible) return null;

  // Calculate priority counts
  const priorityCounts = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Create priority badges
  const priorityBadges: React.ReactNode[] = [];
  if (priorityCounts.urgent > 0) {
    priorityBadges.push(
      <span key="urgent" className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full transition-all duration-300">
        {priorityCounts.urgent}
      </span>
    );
  }
  if (priorityCounts.high > 0) {
    priorityBadges.push(
      <span key="high" className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-orange-500 text-white rounded-full transition-all duration-300">
        {priorityCounts.high}
      </span>
    );
  }
  if (priorityCounts.medium > 0) {
    priorityBadges.push(
      <span key="medium" className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-yellow-500 text-black rounded-full transition-all duration-300">
        {priorityCounts.medium}
      </span>
    );
  }
  if (priorityCounts.low > 0) {
    priorityBadges.push(
      <span key="low" className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-500 text-white rounded-full transition-all duration-300">
        {priorityCounts.low}
      </span>
    );
  }

  const isSpecial = status.id === 'archived' || status.id === 'deleted';
  const isEmpty = tasks.length === 0 && !hasOptimisticItems;

  // Get contrast-aware colors for this background
  const contrastColors = getContrastColors(status.color);

  return (
    <div
      id={listId ? `list-${listId}` : undefined}
      className={`flex flex-col min-w-72 bg-secondary rounded-xl border border-card shadow-lg ${
        isSpecial ? 'opacity-90' : ''
      }`}
      style={{ 
        minHeight: '500px',
        maxHeight: '700px',
        height: '100%' // Ensure consistent height
      }}
    >
      {/* Column Header - Consistent height */}
      <div 
        className="flex items-center justify-between p-4 border-b border-muted rounded-t-xl min-h-[72px]"
        style={{ backgroundColor: status.color }}
      >
        <div 
          className="font-medium text-xl text-white flex-1 min-w-0 items-center"
          style={{ color: contrastColors.headerText }}
          title={status.name}
        >
          <span className="truncate block">
            {status.name}
          </span>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          {priorityBadges.length > 0 && (
            <div className="flex items-center gap-1">
              {priorityBadges}
            </div>
          )}
          <span 
            className="text-sm px-2 py-1 rounded-full font-medium border transition-all duration-300"
            style={{
              backgroundColor: contrastColors.badgeBackground,
              borderColor: contrastColors.badgeBorder,
              color: contrastColors.badgeText
            }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Droppable Area - Fixed dimensions to prevent layout shifts */}
      <div
        ref={ref}
        className="flex-1 flex flex-col relative transition-all duration-200"
        style={{
          minHeight: 0 // Important for flexbox overflow
        }}
        data-testid={`droppable-status-${status.id}`}
      >
        <AnimatePresence mode="wait">
          {/* Special case for archived without add button */}
          {status.id === 'archived' && isEmpty && !isDragging ? (
            <motion.div 
              className="flex-1 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center text-muted">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="mb-3"
                >
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </motion.div>
                <motion.p 
                  className="text-sm font-medium text-muted"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  Archive
                </motion.p>
                <motion.p 
                  className="text-xs text-muted/70 mt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  No archived tasks
                </motion.p>
              </div>
            </motion.div>
          ) : status.id === 'deleted' && isEmpty && !isDragging ? (
            <motion.div 
              className="flex-1 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center text-muted">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="mb-3"
                >
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </motion.div>
                <motion.p 
                  className="text-sm font-medium text-muted"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  Recycle Bin
                </motion.p>
                <motion.p 
                  className="text-xs text-muted/70 mt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  No deleted tasks
                </motion.p>
              </div>
            </motion.div>
          ) : (
            /* Standard layout for all other cases */
            <>
              {/* Tasks Container - always present */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
                {/* Show placeholder in center for empty non-archive containers when not dragging */}
                {isEmpty && !isDragging && status.id !== 'archived' && onAddTask && status.id !== 'deleted' && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted p-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="mb-3"
                      >
                        <svg className="w-16 h-16 mx-auto opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </motion.div>
                      <motion.p 
                        className="text-sm"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                      >
                        No tasks yet
                      </motion.p>
                      <motion.p 
                        className="text-xs mt-1 opacity-70"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                      >
                        Click the button below to add your first task
                      </motion.p>
                    </div>
                  </div>
                )}
                {children}
              </div>

              {/* Add Task Button - Always at bottom */}
              {onAddTask && status.id !== 'deleted' && status.id !== 'archived' && (
                <motion.div 
                  className="p-3 border-t border-secondary"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.button
                    onClick={onAddTask}
                    className="group w-full p-3 text-sm text-secondary rounded-lg hover:text-primary hover:bg-interactive-secondary-hover transition-all duration-200 border-2 border-dashed border-secondary hover:border-accent/60 flex items-center justify-center gap-2 bg-background/30 hover:bg-background/60"
                    disabled={isDragging}
                    style={{ opacity: isDragging ? 0.5 : 1 }}
                    layout
                    layoutId={`add-button-${status.id}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.svg
                        key={isEmpty ? "add-first-icon" : "add-icon"}
                        className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 4v16m8-8H4" 
                        />
                      </motion.svg>
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={isEmpty ? "add-first-task" : "add-task"}
                        className="group-hover:scale-105 transition-transform duration-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isEmpty ? 'Add first task' : 'Add task'}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Main Drag and Drop Provider Component
interface DragAndDropProps {
  lists: List[];
  tasks: Task[];
  boardId: string;
  onTaskMoved: (taskId?: string) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (listId: string) => void;
  columnVisibility?: {
    archived?: boolean;
    deleted?: boolean;
  };
  statusColors?: {
    backlog?: string;
    todo?: string;
    in_progress?: string;
    review?: string;
    done?: string;
    archived?: string;
    deleted?: string;
  };
  boardStatuses?: Array<{
    id: string;
    name: string;
    color: string;
    position: number;
    isDeletable?: boolean;
    isCustom?: boolean;
  }>;
}

export function DragAndDrop({ 
  lists, 
  tasks, 
  boardId, 
  onTaskMoved,
  onTaskClick,
  onAddTask,
  columnVisibility = { archived: true, deleted: false },
  statusColors = {
    backlog: '#6B7280',
    todo: '#3B82F6', 
    in_progress: '#F59E0B',
    review: '#8B5CF6',
    done: '#10B981',
    archived: '#9CA3AF',
    deleted: '#EF4444'
  },
  boardStatuses = DEFAULT_BOARD_STATUSES
}: DragAndDropProps) {
  // State to track if we're currently dragging
  const [isDragging, setIsDragging] = useState(false);
  
  // Sort board statuses by position to ensure correct order
  const sortedBoardStatuses = React.useMemo(() => {
    return [...boardStatuses].sort((a, b) => a.position - b.position);
  }, [boardStatuses]);
  
  // Group tasks by status - memoized to prevent recalculation
  const tasksByStatus = React.useMemo(() => {
    return sortedBoardStatuses.reduce((acc, status) => {
      acc[status.id] = tasks
        .filter(task => task.status === status.id)
        .sort((a, b) => a.position - b.position);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [tasks, sortedBoardStatuses]);

  // State for optimistic updates
  const [items, setItems] = useState(() => {
    const result: Record<string, string[]> = {};
    sortedBoardStatuses.forEach(status => {
      result[status.id] = tasksByStatus[status.id]?.map(task => task.id) || [];
    });
    return result;
  });

  // Keep ref of previous state for cancellation
  const previousItems = useRef(items);

  // Update items when tasks change
  React.useEffect(() => {
    const newItems: Record<string, string[]> = {};
    sortedBoardStatuses.forEach(status => {
      newItems[status.id] = tasksByStatus[status.id]?.map(task => task.id) || [];
    });
    
    setItems(newItems);
    previousItems.current = newItems;
  }, [tasks, tasksByStatus, sortedBoardStatuses]);

  // Handle backend API call for moving tasks
  const moveTaskOnBackend = useCallback(async (
    taskId: string, 
    oldStatus: string, 
    newStatus: string, 
    newPosition: number
  ) => {
    try {
      console.log('🚀 moveTaskOnBackend called with:', { taskId, oldStatus, newStatus, newPosition });
      
      // Find the task to get its current list_id
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      
      // Update both status and position in a single call
      const updates: any = {
        status: newStatus,
        position: newPosition
      };
      
      // Update the task with new status and position
      await apiClient.put(`/api/tasks/${taskId}`, updates);

      const sourceStatusObj = sortedBoardStatuses.find((s) => s.id === oldStatus);
      const targetStatusObj = sortedBoardStatuses.find((s) => s.id === newStatus);

      // Log successful move
      trackEvent('TASK_MOVED', {
        task_id: taskId,
        task_title: task?.title,
        source_status: oldStatus,
        target_status: newStatus,
        new_position: newPosition,
        board_id: boardId,
        success: true,
        timestamp: new Date().toISOString()
      });

      // Show success message
      toast.success(
        `Moved "${task?.title}" from ${sourceStatusObj?.name} to ${targetStatusObj?.name}`
      );

      // Refresh board data after successful move
      onTaskMoved(taskId);

    } catch (error: any) {
      console.error('🚀 Failed to move task:', error);
      
      // Log failed move
      trackEvent('TASK_MOVE_FAILED', {
        task_id: taskId,
        source_status: oldStatus,
        target_status: newStatus,
        board_id: boardId,
        error: error.response?.data?.detail || error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Show error message
      toast.error(`Failed to move task: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      
      // Revert the optimistic update
      setItems(previousItems.current);
      
      // Force refresh to get correct state
      onTaskMoved();
    }
  }, [tasks, boardId, onTaskMoved]);

  return (
    <DragDropProvider
      onDragStart={() => {
        setIsDragging(true);
        previousItems.current = items;
        trackEvent('TASK_DRAG_START', {
          board_id: boardId,
          timestamp: new Date().toISOString()
        });
      }}
      onDragOver={(event) => {
        const { source } = event.operation;
        
        // Only handle item moves in onDragOver for optimistic updates
        if (!source || source?.type !== 'item') return;
        
        console.log('🎯 onDragOver - Optimistic update', event);
        
        // Use the move helper to update items
        setItems((currentItems) => {
          const result = move(currentItems, event);
          console.log('🎯 Move result:', result);
          return result;
        });
      }}
      onDragEnd={async (event) => {
        setIsDragging(false);
        const { source } = event.operation;
        
        console.log('🎯 Drag ended:', { source, canceled: event.canceled });
        
        if (event.canceled) {
          // Revert optimistic updates for canceled operations
          if (source && source.type === 'item') {
            console.log('🎯 Drag canceled - reverting optimistic updates');
            setItems(previousItems.current);
            trackEvent('TASK_DRAG_CANCELLED', {
              board_id: boardId,
              reason: 'user_cancelled'
            });
          }
          return;
        }

        // Handle item moves - make API calls after successful drop
        if (source && source.type === 'item') {
          const taskId = source.id as string;
          console.log('🎯 Task dropped:', taskId);
          
          // Get the source status from the original task data
          const task = tasks.find(t => t.id === taskId);
          if (!task) {
            console.error('🎯 Task not found:', taskId);
            return;
          }
          
          const sourceStatus = task.status;
          
          // Find which status column the task ended up in by checking the current items state
          let targetStatus = sourceStatus; // default to source if not found
          let newPosition = 1;
          
          for (const [statusId, taskIds] of Object.entries(items)) {
            const index = taskIds.indexOf(taskId);
            if (index !== -1) {
              targetStatus = statusId;
              newPosition = index + 1;
              break;
            }
          }
          
          console.log('🎯 Source status:', sourceStatus);
          console.log('🎯 Target status:', targetStatus);
          console.log('🎯 New position:', newPosition);

          // Only make API call if status actually changed or position changed
          if (sourceStatus !== targetStatus || task.position !== newPosition) {
            // Call backend API
            await moveTaskOnBackend(taskId, sourceStatus, targetStatus, newPosition);
          } else {
            console.log('🎯 No change detected, skipping API call');
          }
        } else {
          console.log('🎯 No valid drag operation detected');
        }
      }}
    >
      {/* Responsive Container Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 grid-cols-3xl-5 auto-cols-fr w-full">
        {sortedBoardStatuses.map((status) => {
          // Check visibility
          if (status.id === 'archived' && !columnVisibility.archived) return null;
          if (status.id === 'deleted' && !columnVisibility.deleted) return null;
          
          // Use custom color if available
          const customStatus = {
            ...status,
            color: statusColors[status.id as keyof typeof statusColors] || status.color
          };
          
          return (
            <DroppableStatusColumn
              key={status.id}
              status={customStatus}
              tasks={tasksByStatus[status.id] || []}
              onAddTask={onAddTask ? () => {
                // For backward compatibility, use the first list
                // In the future, we'll create tasks directly with status
                const defaultList = lists[0];
                if (defaultList) {
                  onAddTask(defaultList.id);
                }
              } : undefined}
              isVisible={true}
              isDragging={isDragging}
              hasOptimisticItems={(items[status.id] || []).length > 0}
              listId={status.id}
            >
              {(items[status.id] || []).map((taskId, index) => {
                const task = tasks.find(t => t.id === taskId);
                if (!task) return null;
                
                return (
                  <DraggableTask
                    key={task.id}
                    task={task}
                    index={index}
                    onTaskClick={onTaskClick}
                  >
                    {/* Task Card Content */}
                    <div className={cn(
                      'bg-card rounded-lg border border-card p-4',
                      'hover:shadow-md hover:bg-card-hover',
                      'cursor-pointer select-none space-y-3',
                      // Archived task styling
                      task.status === 'archived' && 'opacity-75'
                    )}>
                      {/* Task Type Badge */}
                      {task.task_type && (
                        <div className="flex justify-between items-start mb-2">
                          <Badge 
                            variant="secondary" 
                            size="sm"
                            className={getTaskTypeColor(task.task_type)}
                          >
                            {task.task_type}
                          </Badge>
                        </div>
                      )}

                      {/* Task Header */}
                      <div className="flex items-start justify-between">
                        <h4 className={cn(
                          "text-sm font-medium text-primary line-clamp-2 flex-1",
                          (task.status === 'done' || task.status === 'completed') && "line-through opacity-60",
                          // Gray out archived tasks
                          task.status === 'archived' && "text-muted line-through"
                        )}>
                          {task.title}
                        </h4>
                        {task.priority && (
                          <span className={cn(
                            'px-2 py-1 text-xs rounded-full ml-2 shrink-0',
                            task.priority === 'low' && 'bg-priority-low text-priority-low border border-priority-low',
                            task.priority === 'medium' && 'bg-priority-medium text-priority-medium border border-priority-medium',
                            task.priority === 'high' && 'bg-priority-high text-priority-high border border-priority-high',
                            task.priority === 'urgent' && 'bg-priority-urgent text-priority-urgent border border-priority-urgent'
                          )}>
                            {task.priority}
                          </span>
                        )}
                      </div>

                      {/* Task Description */}
                      {task.description && (
                        <p className={cn(
                          "text-xs text-secondary line-clamp-1",
                          task.status === 'archived' && "text-muted"
                        )}>
                          {task.description}
                        </p>
                      )}

                      {/* Task Footer */}
                      <div className="flex items-center justify-between">
                        {/* Assignee - Always show profile pic */}
                        <div className="flex items-center space-x-2">
                          {task.assignee_name ? (
                            <div className="h-6 w-6 rounded-full bg-surface border border-secondary flex items-center justify-center text-xs font-medium text-primary">
                              {task.assignee_name.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-surface border border-dashed border-unassigned flex items-center justify-center">
                              <span className="text-xs font-medium text-unassigned">?</span>
                            </div>
                          )}
                          <span className={cn(
                            "text-xs",
                            task.assignee_name ? "text-secondary" : "text-unassigned",
                            task.status === 'archived' && "text-muted"
                          )}>
                            {task.assignee_name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Due Date or Archive Date */}
                        <div className="text-xs text-muted">
                          {task.status === 'archived' ? (
                            <span className="text-muted/80">
                              Archived {new Date(task.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric'
                              })}
                            </span>
                          ) : task.due_date ? (
                            <span>
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Task Metadata */}
                      <div className="flex items-center gap-3 pt-2 border-t border-secondary">
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {task.comments_count || 0}
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {task.attachments_count || 0}
                        </div>
                      </div>
                    </div>
                  </DraggableTask>
                );
              })}
            </DroppableStatusColumn>
          );
        })}
      </div>
    </DragDropProvider>
  );
}

// Export individual components for use in the board
export { DraggableTask, DroppableStatusColumn };
