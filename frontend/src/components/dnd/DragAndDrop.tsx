'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useDroppable } from '@dnd-kit/react';
import { CollisionPriority } from '@dnd-kit/abstract';
import { move } from '@dnd-kit/helpers';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { cn } from '@/lib/utils';

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
    group: task.list_id
  });

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-200 cursor-pointer',
        isDragging && 'opacity-50 scale-95 z-50'
      )}
      data-testid={`draggable-task-${task.id}`}
      onClick={() => onTaskClick(task)}
    >
      {children}
    </div>
  );
}

// Droppable List Component
interface DroppableListProps {
  list: List;
  children: React.ReactNode;
  tasks: Task[];
  onAddTask?: () => void;
}

function DroppableList({ list, children, tasks, onAddTask }: DroppableListProps) {
  const { isDropTarget, ref } = useDroppable({
    id: list.id,
    type: 'column',
    accept: 'item',
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div
      className={cn(
        'flex flex-col min-w-72 bg-secondary rounded-lg border border-card',
        'transition-all duration-200',
        isDropTarget && 'bg-dnd-drop-zone-active border-accent/50'
      )}
    >
      {/* List Header */}
      <div className="flex items-center justify-between p-4 border-b border-muted">
        <h3 className="font-medium text-primary">{list.name}</h3>
        <span className="text-sm text-muted bg-surface px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Droppable Area */}
      <div
        ref={ref}
        className={cn(
          'flex-1 p-3 min-h-[400px] space-y-3',
          'transition-colors duration-200',
          isDropTarget && 'bg-dnd-drop-zone-active'
        )}
        data-testid={`droppable-list-${list.id}`}
      >
        {children}
        
        {/* Add Task Button */}
        {onAddTask && (
          <button
            onClick={onAddTask}
            className={cn(
              'w-full mt-3 p-3 text-sm text-secondary rounded-lg',
              'hover:text-primary hover:bg-surface transition-colors duration-200',
              'border-2 border-dashed border-muted hover:border-accent/50',
              'flex items-center justify-center gap-2'
            )}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}

// Main Drag and Drop Provider Component
interface DragAndDropProps {
  lists: List[];
  tasks: Task[];
  boardId: string;
  onTaskMoved: () => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (listId: string) => void;
}

export function DragAndDrop({ 
  lists, 
  tasks, 
  boardId, 
  onTaskMoved,
  onTaskClick,
  onAddTask
}: DragAndDropProps) {
  // Group tasks by list
  const tasksByList = lists.reduce((acc, list) => {
    acc[list.id] = tasks
      .filter(task => task.list_id === list.id)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<string, Task[]>);

  // State for optimistic updates
  const [items, setItems] = useState(() => {
    const result: Record<string, string[]> = {};
    lists.forEach(list => {
      result[list.id] = tasksByList[list.id]?.map(task => task.id) || [];
    });
    return result;
  });

  // Keep ref of previous state for cancellation
  const previousItems = useRef(items);

  // Update items when tasks change
  React.useEffect(() => {
    const newItems: Record<string, string[]> = {};
    lists.forEach(list => {
      newItems[list.id] = tasksByList[list.id]?.map(task => task.id) || [];
    });
    setItems(newItems);
    previousItems.current = newItems;
  }, [tasks, lists]);

  // Handle backend API call for moving tasks
  const moveTaskOnBackend = useCallback(async (
    taskId: string, 
    sourceListId: string, 
    targetListId: string, 
    newPosition: number
  ) => {
    try {
      console.log('🚀 moveTaskOnBackend called with:', { taskId, sourceListId, targetListId, newPosition });
      
      const payload = {
        list_id: targetListId,
        position: newPosition
      };
      
      console.log('🚀 Making API request to:', `/api/tasks/${taskId}/move`);
      console.log('🚀 Payload:', payload);
      
      await apiClient.put(`/api/tasks/${taskId}/move`, payload);
      
      console.log('🚀 API call successful');

      const task = tasks.find(t => t.id === taskId);
      const sourceList = lists.find(l => l.id === sourceListId);
      const targetList = lists.find(l => l.id === targetListId);

      // Log successful move
      trackEvent('TASK_MOVED', {
        task_id: taskId,
        task_title: task?.title,
        source_list_id: sourceListId,
        target_list_id: targetListId,
        new_position: newPosition,
        board_id: boardId,
        success: true,
        timestamp: new Date().toISOString()
      });

      // Show success message
      toast.success(
        `Moved "${task?.title}" from ${sourceList?.name} to ${targetList?.name}`
      );

      // Refresh board data
      console.log('🚀 Calling onTaskMoved to refresh board data');
      onTaskMoved();

    } catch (error: any) {
      console.error('🚀 Failed to move task:', error);
      console.error('🚀 Error details:', error.response?.data || error.message);
      
      // Log failed move
      trackEvent('TASK_MOVE_FAILED', {
        task_id: taskId,
        source_list_id: sourceListId,
        target_list_id: targetListId,
        board_id: boardId,
        error: error.message || 'Unknown error',
        error_details: error.response?.data || {},
        timestamp: new Date().toISOString()
      });

      // Show error message
      toast.error(`Failed to move task: ${error.message || 'Unknown error'}`);
      
      // Revert the optimistic update
      console.log('🚀 Reverting optimistic update');
      setItems(previousItems.current);
    }
  }, [tasks, lists, boardId, onTaskMoved]);

  return (
    <DragDropProvider
      onDragStart={() => {
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
        
        console.log('🎯 onDragOver - Optimistic update');
        setItems((items) => move(items, event));
      }}
      onDragEnd={async (event) => {
        const { source, target } = event.operation;
        
        console.log('🎯 Drag ended:', { source, target, canceled: event.canceled });
        
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
        if (source && target && source.type === 'item') {
          const taskId = source.id as string;
          console.log('🎯 Task dropped:', taskId);
          
          // Get the source list ID from the task data
          const task = tasks.find(t => t.id === taskId);
          if (!task) {
            console.error('🎯 Task not found:', taskId);
            return;
          }
          
          const sourceListId = task.list_id;
          console.log('🎯 Source list:', sourceListId);
          
          // Determine target list ID
          let targetListId: string;
          
          if (target.type === 'column') {
            // Direct drop on column
            targetListId = target.id as string;
          } else if (target.type === 'item') {
            // Dropped on another task - get that task's list
            const targetTask = tasks.find(t => t.id === target.id);
            if (!targetTask) {
              console.error('🎯 Target task not found:', target.id);
              return;
            }
            targetListId = targetTask.list_id;
          } else {
            console.error('🎯 Invalid target type:', target.type);
            return;
          }
          
          console.log('🎯 Target list:', targetListId);
          
          // Only make API call if moving to a different list
          if (sourceListId !== targetListId) {
            console.log('🎯 Making API call to move task between lists');
            
            // Calculate new position based on current items state
            const targetTasks = items[targetListId] || [];
            const newPosition = targetTasks.length > 0 
              ? targetTasks.length + 1 
              : 1;

            console.log('🎯 New position:', newPosition);

            // Call backend API
            await moveTaskOnBackend(taskId, sourceListId, targetListId, newPosition);
          } else {
            console.log('🎯 Task moved within same list - only reordering');
            trackEvent('TASK_REORDERED', {
              task_id: taskId,
              list_id: sourceListId,
              board_id: boardId,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.log('🎯 No valid drag operation detected');
        }
      }}
    >
      {/* Responsive Container Grid */}
      <div className={cn(
        'grid gap-6 p-6',
        'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
        'grid-cols-3xl-5', // Custom 3xl breakpoint
        'auto-cols-fr', // Equal width columns
        'w-full'
      )}>
        {lists.map((list) => (
          <DroppableList
            key={list.id}
            list={list}
            tasks={tasksByList[list.id] || []}
            onAddTask={onAddTask ? () => onAddTask(list.id) : undefined}
          >
            {(items[list.id] || []).map((taskId, index) => {
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
                    'hover:shadow-md hover:bg-card-hover transition-all duration-200',
                    'cursor-pointer select-none space-y-3'
                  )}>
                    {/* Task Header */}
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-primary line-clamp-2 flex-1">
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
                      <p className="text-xs text-secondary line-clamp-1">
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
                          task.assignee_name ? "text-secondary" : "text-unassigned"
                        )}>
                          {task.assignee_name || 'Unassigned'}
                        </span>
                      </div>

                      {/* Due Date - Always on the right */}
                      {task.due_date && (
                        <span className="text-xs text-muted">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Task Metadata */}
                    {(task.comments_count || task.attachments_count) && (
                      <div className="flex items-center gap-3 pt-2 border-t border-secondary">
                        {task.comments_count ? (
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {task.comments_count}
                          </div>
                        ) : null}
                        
                        {task.attachments_count ? (
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {task.attachments_count}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </DraggableTask>
              );
            })}
          </DroppableList>
        ))}
      </div>
    </DragDropProvider>
  );
}

// Export individual components for use in the board
export { DraggableTask, DroppableList };
