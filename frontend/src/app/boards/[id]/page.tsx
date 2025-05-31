'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
} from '@/components/ui/CustomDialog';
import { 
  Plus, 
  Eye,
  Users
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import CreateTaskModal from '@/components/CreateTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { DragAndDrop } from '@/components/dnd/DragAndDrop';

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
      current_tasks_count: tasks.filter(t => t.list_id === listId).length
    });
    
    setCreateTaskListId(listId);
    setShowCreateTask(true);
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
        <div className="bg-card rounded-lg shadow-card p-6 border border-card transition-all duration-300 theme-transition">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary transition-colors duration-300">
                {loading ? 'Loading...' : board?.name || 'Board'}
              </h1>
              <p className="text-secondary mt-1 transition-colors duration-300">
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
              {/* Only show Add List button for admins and managers */}
              {user && (user.role === 'admin' || user.role === 'manager') && (
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} data-testid="add-list-button">
                  Add List
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Board Content with Drag & Drop */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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
          <DragAndDrop
            lists={lists}
            tasks={tasks}
            boardId={boardId}
            onTaskMoved={loadBoardData}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
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