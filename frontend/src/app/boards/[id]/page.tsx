'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle,
  CustomDialogDescription as DialogDescription,
  CustomDialogFooter as DialogFooter,
} from '@/components/ui/CustomDialog';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar,
  MessageSquare,
  Paperclip,
  Eye,
  Users,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import CreateTaskModal from '@/components/CreateTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';

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
function TaskCardContent({ task }: { task: Task }) {
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

  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Task Title and Description */}
      <div className="flex-1 mb-3">
        <h3 className="font-medium text-primary text-sm leading-tight mb-2">
          {task.title}
        </h3>

        {/* Task Description */}
        {task.description && (
          <p className="text-xs text-secondary line-clamp-2 mb-3">
            {task.description}
          </p>
        )}
      </div>

      {/* Due Date (if exists) */}
      {task.due_date && (
        <div className="flex items-center space-x-1 text-xs text-warning mb-3">
          <Calendar className="h-3 w-3" />
          <span>Due {formatDate(task.due_date)}</span>
        </div>
      )}

      {/* Bottom Section - Priority and Metadata */}
      <div className="mt-auto space-y-3">
        {/* Priority Badge */}
        <div className="flex justify-start">
          <Badge variant={getPriorityColor(task.priority)} size="sm">
            {task.priority}
          </Badge>
        </div>

        {/* Bottom Row - Avatar, Comments, Created Date */}
        <div className="flex items-center justify-between">
          {/* Left side - Assignee */}
          <div className="flex items-center">
            {task.assignee_name ? (
              <Avatar size="sm" name={task.assignee_name} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xs text-muted">?</span>
              </div>
            )}
          </div>

          {/* Right side - Comments and Created Date */}
          <div className="flex items-center space-x-3 text-xs text-muted">
            {/* Comments Count */}
            {task.comments_count && task.comments_count > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments_count}</span>
              </div>
            )}
            
            {/* Attachments Count */}
            {task.attachments_count && task.attachments_count > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachments_count}</span>
              </div>
            )}

            {/* Created Date */}
            <span className="text-xs text-muted">
              {formatCreatedDate(task.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <div
      className="bg-card rounded-lg border border-card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer min-h-[140px] flex flex-col"
      onClick={() => onClick(task)}
      data-testid={`task-card-${task.id}`}
    >
      <TaskCardContent task={task} />
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
  const getListColor = (listName: string) => {
    const name = listName.toLowerCase();
    if (name.includes('todo') || name.includes('backlog')) return 'bg-card border-secondary';
    if (name.includes('progress') || name.includes('doing')) return 'bg-card border-accent';
    if (name.includes('review') || name.includes('testing')) return 'bg-card border-warning';
    if (name.includes('done') || name.includes('completed')) return 'bg-card border-success';
    return 'bg-card border-secondary';
  };

  return (
    <div className="flex-shrink-0 w-full lg:w-96">
      <div className={`rounded-lg border-2 p-4 h-full transition-colors flex flex-col ${getListColor(list.name)}`}>
        {/* List Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-primary leading-none text-lg">{list.name}</h2>
            <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full font-medium leading-none">
              {tasks.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="flex items-center">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Tasks Container */}
        <div
          className="space-y-3 min-h-[200px] lg:min-h-[400px] flex-1"
          data-testid={`list-${list.id}`}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
            />
          ))}
        </div>

        {/* Add Task Button - Always at bottom */}
        <Button
          variant="ghost"
          className="w-full mt-4 border-2 border-dashed border-secondary hover:border-accent flex-shrink-0"
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskListId, setCreateTaskListId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
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

  const handleTaskClick = (task: Task) => {
    // Add enhanced task interaction tracking
    trackEvent('TASK_INTERACTION', {
      interaction_type: 'task_click',
      task_id: task.id,
      task_title: task.title,
      task_priority: task.priority,
      task_status: task.status,
      board_id: boardId,
      timestamp: new Date().toISOString()
    });

    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleAddTask = (listId: string) => {
    // Log add task click
    trackEvent('ADD_TASK_CLICK', {
      page: 'board',
      board_id: boardId,
      list_id: listId
    });
    
    // Add enhanced task creation tracking
    trackEvent('TASK_CREATION_ATTEMPT', {
      interaction_type: 'add_task_button',
      board_id: boardId,
      target_list_id: listId,
      timestamp: new Date().toISOString(),
      current_tasks_count: getTasksForList(listId).length
    });
    
    setCreateTaskListId(listId);
    setShowCreateTask(true);
  };

  const getTasksForList = (listId: string) => {
    return tasks
      .filter(task => task.list_id === listId)
      .sort((a, b) => a.position - b.position);
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiClient.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Fallback to current user only
      if (user) {
        setUsers([user]);
      }
    } finally {
      setLoadingUsers(false);
    }
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
                  <div className="space-y-4">
                    <Skeleton width="50%" />
                    <div className="space-y-3">
                      {[1, 2, 3].map((j) => (
                        <Skeleton key={j} height="5rem" />
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* Desktop Layout - Flex Wrap */}
            <div className="hidden lg:block">
              <div className="flex flex-wrap gap-6" data-testid="board-lists">
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
          </div>
        )}

        {/* Task Creation Modal - Centered */}
        <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
          <DialogContent className="max-w-2xl">
            <CreateTaskModal 
              listId={createTaskListId}
              lists={lists}
              users={users}
              loadingUsers={loadingUsers}
              onClose={() => setShowCreateTask(false)}
              onTaskCreated={loadBoardData}
              onLoadUsers={loadUsers}
            />
          </DialogContent>
        </Dialog>
        
        {/* Task Detail Modal - Centered */}
        <Dialog open={showTaskDetail} onOpenChange={setShowTaskDetail}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            {selectedTask && (
              <TaskDetailModal
                task={selectedTask}
                lists={lists}
                users={users}
                currentUser={user!}
                onClose={() => setShowTaskDetail(false)}
                onTaskUpdated={loadBoardData}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 