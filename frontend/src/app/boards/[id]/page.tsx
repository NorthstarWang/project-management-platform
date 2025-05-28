'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar,
  MessageSquare,
  Paperclip,
  Eye,
  Users
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
}

interface List {
  id: string;
  name: string;
  board_id: string;
  position: number;
  created_at: string;
}

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

// Helper component for task card content
function TaskCardContent({ task, showDragHandle = false }: { task: Task; showDragHandle?: boolean }) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      {showDragHandle && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-4 bg-gray-4 rounded-full"></div>
            <div className="w-1 h-4 bg-gray-4 rounded-full"></div>
          </div>
          <div className="text-xs text-muted">#{task.id.slice(-4)}</div>
        </div>
      )}
      
      <div className="space-y-3">
        {/* Task Title */}
        <h3 className="font-medium text-primary text-sm leading-tight">
          {task.title}
        </h3>

        {/* Task Description */}
        {task.description && (
          <p className="text-xs text-secondary line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Priority Badge */}
        <div className="flex items-center justify-between">
          <Badge variant={getPriorityColor(task.priority)} size="sm">
            {task.priority}
          </Badge>
          {task.due_date && (
            <div className="flex items-center space-x-1 text-xs text-muted">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between">
          {/* Assignee */}
          <div className="flex items-center space-x-2">
            {task.assignee_name && (
              <Avatar size="xs" name={task.assignee_name} />
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-2 text-xs text-muted">
            {task.comments_count && task.comments_count > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments_count}</span>
              </div>
            )}
            {task.attachments_count && task.attachments_count > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachments_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-lg border border-card p-4 shadow-sm hover:shadow-md transition-all select-none ${
        isDragging ? 'shadow-xl border-accent' : ''
      }`}
      data-testid={`task-card-${task.id}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center space-x-2">
          <div className="w-1 h-4 bg-gray-4 rounded-full"></div>
          <div className="w-1 h-4 bg-gray-4 rounded-full"></div>
        </div>
        <div className="text-xs text-muted">#{task.id.slice(-4)}</div>
      </div>

      {/* Task Content - Clickable */}
      <div onClick={() => onClick(task)} className="cursor-pointer">
        <TaskCardContent task={task} />
      </div>
    </div>
  );
}

interface ListColumnProps {
  list: List;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (listId: string) => void;
}

function ListColumn({ list, tasks, onTaskClick, onAddTask }: ListColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: `droppable-${list.id}`,
  });

  const getListColor = (listName: string) => {
    const name = listName.toLowerCase();
    if (name.includes('todo') || name.includes('backlog')) return 'bg-card border-secondary';
    if (name.includes('progress') || name.includes('doing')) return 'bg-card border-accent';
    if (name.includes('review') || name.includes('testing')) return 'bg-card border-warning';
    if (name.includes('done') || name.includes('completed')) return 'bg-card border-success';
    return 'bg-card border-secondary';
  };

  return (
    <div className="flex-shrink-0 w-full lg:w-80">
      <div className={`rounded-lg border-2 p-4 h-full transition-colors ${getListColor(list.name)} ${isOver ? 'border-accent bg-accent-1' : ''}`}>
        {/* List Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold text-primary">{list.name}</h2>
            <span className="bg-gray-3 text-primary text-xs px-2 py-1 rounded-full">
              {tasks.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="flex items-center">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Tasks Container */}
        <div
          ref={setNodeRef}
          className="space-y-3 min-h-[200px] lg:min-h-[400px]"
          data-testid={`list-${list.id}`}
        >
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
              />
            ))}
          </SortableContext>
        </div>

        {/* Add Task Button */}
        <Button
          variant="ghost"
          className="w-full mt-4 border-2 border-dashed border-secondary hover:border-accent"
          onClick={() => onAddTask(list.id)}
          data-testid={`add-task-${list.id}`}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add a task
        </Button>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const sessionId = localStorage.getItem('session_id');
    
    if (!userData || !sessionId) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Set user ID header for API calls
    apiClient.setUserIdHeader(parsedUser.id);
    
    // Log board page view
    trackEvent('PAGE_VIEW', {
      page_name: 'board',
      page_url: `/boards/${boardId}`,
      board_id: boardId,
      user_id: parsedUser.id,
      user_role: parsedUser.role
    });
    
    // Load board data
    loadBoardData();
  }, [router, boardId]);

  const loadBoardData = async () => {
    try {
      setLoading(true);
      
      // Load board details - this endpoint returns board with lists and tasks
      const boardResponse = await apiClient.get(`/api/boards/${boardId}`);
      const boardData = boardResponse.data;
      
      setBoard(boardData);
      
      // The board endpoint returns lists and tasks included
      if (boardData.lists) {
        setLists(boardData.lists);
        
        // Extract tasks from lists
        const allTasks: Task[] = [];
        boardData.lists.forEach((list: any) => {
          if (list.tasks) {
            allTasks.push(...list.tasks);
          }
        });
        setTasks(allTasks);
      } else {
        // Fallback: set empty arrays if no lists
        setLists([]);
        setTasks([]);
      }

    } catch (error: any) {
      console.error('Failed to load board data:', error);
      toast.error('Failed to load board data');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Determine the target list
    let targetListId: string;
    let targetPosition: number;

    // Check if dropped on a droppable list container
    if (over.id.toString().startsWith('droppable-')) {
      targetListId = over.id.toString().replace('droppable-', '');
      const listTasks = tasks.filter(t => t.list_id === targetListId);
      targetPosition = listTasks.length;
    } else {
      // Dropped on another task
      const targetTask = tasks.find(t => t.id === over.id);
      if (!targetTask) return;
      
      targetListId = targetTask.list_id;
      targetPosition = targetTask.position;
    }

    // If no change, return
    if (activeTask.list_id === targetListId && activeTask.position === targetPosition) {
      return;
    }

    try {
      // Optimistically update the UI
      const updatedTasks = tasks.map(task => {
        if (task.id === activeTask.id) {
          return { ...task, list_id: targetListId, position: targetPosition };
        }
        return task;
      });
      setTasks(updatedTasks);

      // Make API call to move the task
      await apiClient.put(`/api/tasks/${activeTask.id}/move`, {
        list_id: targetListId,
        position: targetPosition
      });

      toast.success('Task moved successfully');

    } catch (error: any) {
      console.error('Failed to move task:', error);
      toast.error('Failed to move task');
      
      // Revert the optimistic update
      setTasks(tasks);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleAddTask = (listId: string) => {
    // Log add task click
    trackEvent('ADD_TASK_CLICK', {
      page: 'board',
      board_id: boardId,
      list_id: listId
    });
    
    // TODO: Open add task modal
    toast.info('Add task functionality coming soon');
  };

  const getTasksForList = (listId: string) => {
    return tasks
      .filter(task => task.list_id === listId)
      .sort((a, b) => a.position - b.position);
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Board Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {loading ? 'Loading...' : board?.name || 'Board'}
              </h1>
              <p className="text-secondary mt-1">
                {loading ? 'Loading board details...' : board?.description || 'Board description'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" leftIcon={<Users className="h-4 w-4" />}>
                Members
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                View
              </Button>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} data-testid="add-list-button">
                Add List
              </Button>
            </div>
          </div>
        </div>

        {/* Board Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full">
                <Card className="p-4 h-96">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-3 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-20 bg-gray-3 rounded"></div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Desktop Layout - Horizontal Scroll */}
            <div className="hidden lg:block">
              <div className="flex space-x-6 overflow-x-auto pb-6" data-testid="board-lists">
                {lists.map((list) => (
                  <ListColumn
                    key={list.id}
                    list={list}
                    tasks={getTasksForList(list.id)}
                    onTaskClick={handleTaskClick}
                    onAddTask={handleAddTask}
                  />
                ))}
              </div>
            </div>

            {/* Mobile/Tablet Layout - Grid */}
            <div className="lg:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="board-lists-mobile">
                {lists.map((list) => (
                  <div key={list.id} className="w-full">
                    <ListColumn
                      list={list}
                      tasks={getTasksForList(list.id)}
                      onTaskClick={handleTaskClick}
                      onAddTask={handleAddTask}
                    />
                  </div>
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="w-80 bg-card rounded-lg border border-accent p-4 shadow-2xl rotate-2 opacity-95">
                  <TaskCardContent task={activeTask} showDragHandle />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Task Detail Modal - Right Aligned */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-start justify-end">
            <div 
              className="absolute inset-0 bg-dialog-overlay"
              onClick={() => setSelectedTask(null)}
            />
            <div className="relative bg-card w-96 h-full shadow-xl overflow-y-auto border-l border-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-primary">Task Details</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedTask(null)}
                    data-testid="close-task-modal"
                  >
                    ×
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-primary">{selectedTask.title}</h3>
                    <p className="text-sm text-secondary mt-1">{selectedTask.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge variant={selectedTask.priority === 'high' ? 'high' : selectedTask.priority === 'medium' ? 'medium' : 'low'}>
                      {selectedTask.priority}
                    </Badge>
                    {selectedTask.assignee_name && (
                      <div className="flex items-center space-x-2">
                        <Avatar size="sm" name={selectedTask.assignee_name} />
                        <span className="text-sm text-secondary">{selectedTask.assignee_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedTask.due_date && (
                    <div className="flex items-center space-x-2 text-sm text-secondary">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(selectedTask.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-secondary">
                    <p className="text-sm text-muted">
                      Task details and comments will be implemented in the next phase.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 