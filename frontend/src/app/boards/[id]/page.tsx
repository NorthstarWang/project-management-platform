'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
} from '@/components/ui/CustomDialog';
import { 
  Eye,
  Users,
  Settings,
  ListOrdered,
  Tags,
  Trash2,
  Calendar
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { Switch } from '@/components/ui/Switch';
import CreateTaskModal from '@/components/CreateTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { DragAndDrop } from '@/components/dnd/DragAndDrop';
import { CustomizeStatusesModal } from '@/components/CustomizeStatusesModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getIconComponent } from '@/components/ui/IconSelector';
import { CustomFieldsSection } from '@/components/custom-fields';
import { WorkflowBuilder } from '@/components/dependencies/WorkflowBuilder';

const DEFAULT_STATUS_COLORS = {
  backlog: '#6B7280',
  todo: '#3B82F6',
  in_progress: '#F59E0B',
  review: '#8B5CF6',
  done: '#10B981',
  archived: '#9CA3AF',
  deleted: '#EF4444'
}

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
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
      track(actionType, {
        text: payload.text || `User performed ${actionType} action`,
        ...payload
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
};

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const boardId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [board, setBoard] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskListId, setCreateTaskListId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomizeStatuses, setShowCustomizeStatuses] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [columnVisibility, setColumnVisibility] = useState({
    archived: true,
    deleted: false
  });
  const [boardStatuses, setBoardStatuses] = useState<any[]>([]);
  const [taskCountsByStatus, setTaskCountsByStatus] = useState<Record<string, number>>({});
  const [statusColors, setStatusColors] = useState(DEFAULT_STATUS_COLORS);
  
  // Temporary settings for board settings modal
  const [tempColumnVisibility, setTempColumnVisibility] = useState(columnVisibility);
  const [tempStatusColors, setTempStatusColors] = useState(statusColors);

  const loadBoardData = useCallback(async (currentUser?: User, signal?: AbortSignal) => {
    if (!boardId || !currentUser) return;

    try {
      setLoading(true);
      // Fetch board details with lists and tasks
      //@ts-expect-error signal as string
      const boardResponse = await apiClient.get(`/api/boards/${boardId}`, { signal });
      if (signal?.aborted) return;
      
      const boardData = boardResponse.data;
      setBoard(boardData);
      setLists(boardData.lists || []);

      // Fetch project details for permission checks
      if (boardData.project_id) {
        try {
        //@ts-expect-error signal as string
          const projectResponse = await apiClient.get(`/api/projects/${boardData.project_id}`, { signal });
          if (!signal?.aborted) {
            setProjectDetails(projectResponse.data);
          }
        } catch (error) {
          if (!signal?.aborted) {
            console.error('Failed to load project details:', error);
          }
        }
      }

      // Collect all tasks from lists
      const allTasks: any[] = [];
      boardData.lists.forEach((list: any) => {
        if (list.tasks && list.tasks.length > 0) {
          allTasks.push(...list.tasks);
        }
      });
      setTasks(allTasks);

      // Fetch board statuses
      //@ts-expect-error signal as string
      const statusesResponse = await apiClient.get(`/api/boards/${boardId}/statuses`, { signal });
      if (signal?.aborted) return;
      
      setBoardStatuses(statusesResponse.data);
      
      // Update status colors from backend statuses
      const newStatusColors = { ...DEFAULT_STATUS_COLORS };
      statusesResponse.data.forEach((status: any) => {
        if (newStatusColors.hasOwnProperty(status.id)) {
          newStatusColors[status.id as keyof typeof newStatusColors] = status.color;
        }
      });
      setStatusColors(newStatusColors);

      // Fetch task counts by status
      //@ts-expect-error signal as string
      const countsResponse = await apiClient.get(`/api/boards/${boardId}/task-counts`, { signal });
      if (signal?.aborted) return;
      
      setTaskCountsByStatus(countsResponse.data);

      // Log board view
      trackEvent('BOARD_VIEW', {
        board_id: boardId,
        board_name: boardData.name,
        list_count: boardData.lists.length,
        task_count: allTasks.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load board data:', error);
        toast.error('Failed to load board data');
      }
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      
      // If user is a manager or admin, load their team members
      if (user && (user.role === 'manager' || user.role === 'admin')) {
        const response = await apiClient.get('/api/users/me/team-members');
        setUsers(response.data);
      } else {
        // For regular members, just load themselves
        if (user) {
          setUsers([user]);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // Fallback to current user only
      if (user) {
        setUsers([user]);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  const handleTaskClick = useCallback((task: Task) => {
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
    
    // Load users if not already loaded, before showing task detail
    if (users.length === 0 && !loadingUsers) {
      loadUsers();
    }
    
    setShowTaskDetail(true);
  }, [boardId, users.length, loadingUsers, loadUsers]);
  
  useEffect(() => {
    const abortController = new AbortController();
    
    const initializeBoard = async () => {
      // Check if user is logged in
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      
      if (abortController.signal.aborted) return;
      
      setUser(parsedUser);
      
      // Log board page view
      trackEvent('PAGE_VIEW', {
        page_name: 'board',
        page_url: `/boards/${boardId}`,
        board_id: boardId,
        user_id: parsedUser.id,
        user_role: parsedUser.role
      });
      
      // Load board data with abort signal
      await loadBoardData(parsedUser, abortController.signal);
    };
    
    initializeBoard();
    
    // Cleanup function - abort any in-flight requests
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, boardId]); // Removed loadBoardData from dependencies to prevent loops

  // Handle URL parameters for search navigation
  useEffect(() => {
    const taskId = searchParams.get('task');
    const listId = searchParams.get('list');
    const commentId = searchParams.get('comment');
    
    if (taskId && tasks.length > 0) {
      // Find the task
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // Delay to ensure the board is fully rendered
        setTimeout(() => {
          // First scroll to the list containing the task
          if (listId) {
            const listElement = document.getElementById(`list-${listId}`);
            if (listElement) {
              listElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          
          // Open the task modal with animation
          handleTaskClick(task);
          
          // If there's a specific comment to scroll to, handle it after modal opens
          if (commentId) {
            setTimeout(() => {
              const commentElement = document.getElementById(`comment-${commentId}`);
              if (commentElement) {
                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add highlight animation
                commentElement.classList.add('animate-pulse', 'bg-accent/20');
                setTimeout(() => {
                  commentElement.classList.remove('animate-pulse', 'bg-accent/20');
                }, 3000);
              }
            }, 500); // Wait for modal to open
          }
          
          // Clean up URL params after navigation
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('task');
          newUrl.searchParams.delete('list');
          newUrl.searchParams.delete('comment');
          window.history.replaceState(null, '', newUrl.toString());
        }, 500); // Delay to ensure board is rendered
      }
    }
  }, [searchParams, tasks, handleTaskClick]);

  // Handle task updates without full reload
  const handleTaskMoved = async (taskId?: string) => {
    // If a specific task was moved and we want to update just that task
    if (taskId) {
      try {
        // Fetch just the updated task
        const response = await apiClient.get(`/api/tasks/${taskId}`);
        const updatedTask = response.data;
        
        // Update the task in the local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, ...updatedTask } : task
          )
        );
      } catch (error) {
        console.error('Failed to fetch updated task:', error);
        // Only do full reload on error
        if (user) {
          loadBoardData(user);
        }
      }
    } else {
      // If no specific task ID, do a background refresh without loading state
      try {
        const boardResponse = await apiClient.get(`/api/boards/${boardId}`);
        const boardData = boardResponse.data;
        
        if (boardData.lists) {
          const boardLists = [...boardData.lists];
          boardLists.sort((a: any, b: any) => a.position - b.position);
          
          // Extract tasks from lists
          const allTasks: Task[] = [];
          boardLists.forEach((list: any) => {
            if (list.tasks) {
              allTasks.push(...list.tasks);
            }
          });
          
          // Update without setting loading state to prevent flicker
          setLists(boardLists);
          setTasks(allTasks);
        }
      } catch (error) {
        console.error('Failed to refresh board data:', error);
      }
    }
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

  // Convert backend statuses to modal format
  const getCurrentStatuses = () => {
    return boardStatuses.map(status => ({
      id: status.id,
      name: status.name,
      color: status.color,
      position: status.position,
      isDeletable: status.isDeletable,
      isCustom: status.isCustom || false
    }));
  };

  // Handle saving customized statuses
  const handleSaveStatuses = async (statuses: any[], migrationMapping: Record<string, string>) => {
    try {
      // Call the backend to update statuses
      const response = await apiClient.put(`/api/boards/${boardId}/statuses`, {
        statuses,
        migrationMapping
      });

      // Update local state with response
      setBoardStatuses(response.data);
      
      // Update status colors
      const newStatusColors = { ...statusColors };
      response.data.forEach((status: any) => {
        if (newStatusColors.hasOwnProperty(status.id)) {
          newStatusColors[status.id as keyof typeof newStatusColors] = status.color;
        }
      });
      setStatusColors(newStatusColors);

      // Reload board data to get updated tasks
      if (user) {
        await loadBoardData(user);
      }

      // Log status customization
      trackEvent('BOARD_STATUSES_CUSTOMIZED', {
        board_id: boardId,
        statuses_count: statuses.length,
        migrations_count: Object.keys(migrationMapping).length,
        timestamp: new Date().toISOString()
      });

      toast.success('Status configuration saved successfully');
    } catch (error) {
      console.error('Failed to save status configuration:', error);
      toast.error('Failed to save status configuration');
      throw error;
    }
  };

  const canDeleteBoard = () => {
    if (!user || !board) return false;
    
    if (user.role === 'admin') return true;
    
    if (user.role === 'manager') {
      // Check if user created the board
      if (board.created_by === user.id) return true;
      // Check if user created the project
      if (projectDetails?.created_by === user.id) return true;
      // Check if user is assigned as a project manager
      // This would require checking project managers, but for simplicity
      // we'll allow managers to delete boards they can access
      return true;
    }
    
    return false;
  };

  const handleDeleteBoard = async () => {
    if (!board) return;

    try {
      setIsDeleting(true);
      
      const response = await apiClient.delete(`/api/boards/${boardId}`);
      
      // Log successful deletion
      trackEvent('BOARD_DELETE', {
        board_id: boardId,
        board_name: board.name,
        project_id: board.project_id,
        cascade_deleted: response.data.cascadeDeleted,
        timestamp: new Date().toISOString()
      });
      
      toast.success(`Board "${board.name}" deleted successfully`);
      
      // Navigate back to project page
      router.push(`/projects/${board.project_id}`);
    } catch (error: any) {
      console.error('Failed to delete board:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete board');
      
      // Log deletion error
      trackEvent('BOARD_DELETE_ERROR', {
        board_id: boardId,
        error: error.response?.data?.detail || error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteClick = () => {
    trackEvent('BOARD_DELETE_ATTEMPT', {
      board_id: boardId,
      board_name: board?.name,
      lists_count: lists.length,
      tasks_count: tasks.length,
      timestamp: new Date().toISOString()
    });
    
    setShowDeleteConfirm(true);
  };

  const formatDate = (dateString: string | number) => {
    // Handle Unix timestamp (convert from seconds to milliseconds)
    const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Board Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card transition-all duration-300 theme-transition">
          {/* Top Row - Main Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {(() => {
                  const IconComponent = getIconComponent(board?.icon || 'kanban');
                  return <IconComponent className="h-12 w-12 text-accent" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-primary transition-colors duration-300">
                  {loading ? 'Loading...' : board?.name || 'Board'}
                </h1>
                <p className="text-secondary mt-1 transition-colors duration-300">
                  {loading ? 'Loading board details...' : board?.description || 'Board description'}
                </p>
                {board && (
                  <div className="flex items-center mt-2 text-sm text-muted">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Created {formatDate(board.created_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Row - Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-secondary">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" leftIcon={<Users className="h-4 w-4" />}>
                Members
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                View
              </Button>
            </div>
            
            {/* Management buttons for admins and managers */}
            {user && (user.role === 'admin' || user.role === 'manager') && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  leftIcon={<ListOrdered className="h-4 w-4" />}
                  onClick={() => setShowCustomizeStatuses(true)}
                >
                  Statuses
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  leftIcon={<Tags className="h-4 w-4" />}
                  onClick={() => toast.info('Task type customization coming soon!')}
                >
                  Task Types
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  leftIcon={<Settings className="h-4 w-4" />}
                  onClick={() => setShowSettings(true)}
                >
                  Settings
                </Button>
                {canDeleteBoard() && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={handleDeleteClick}
                    className="text-error hover:text-error hover:bg-error/10"
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
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
            onTaskMoved={handleTaskMoved}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            columnVisibility={columnVisibility}
            statusColors={statusColors}
            boardStatuses={boardStatuses}
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
              onTaskCreated={async () => {
                await loadBoardData(user)
              }}
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
                onTaskUpdated={async () => {
                  await loadBoardData(user)
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Customize Statuses Modal */}
        {user && (user.role === 'admin' || user.role === 'manager') && (
          <CustomizeStatusesModal
            open={showCustomizeStatuses}
            onOpenChange={setShowCustomizeStatuses}
            initialStatuses={getCurrentStatuses()}
            taskCounts={taskCountsByStatus}
            onSave={handleSaveStatuses}
          />
        )}

        {/* Board Settings Modal */}
        {user && (user.role === 'admin' || user.role === 'manager') && (
          <Dialog open={showSettings} onOpenChange={(open) => {
            if (open) {
              // Initialize temp states when opening modal
              setTempColumnVisibility(columnVisibility);
              setTempStatusColors(statusColors);
            }
            setShowSettings(open);
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-primary">Board Settings</h2>
                  <p className="text-sm text-muted-foreground">Configure column visibility and board preferences</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-primary">Column Visibility</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <div>
                          <label htmlFor="archived-visibility" className="text-sm font-medium text-primary cursor-pointer">Archived Tasks</label>
                          <p className="text-xs text-muted-foreground">Show completed and archived tasks</p>
                        </div>
                      </div>
                      <Switch
                        id="archived-visibility"
                        checked={tempColumnVisibility.archived}
                        onCheckedChange={(checked) => setTempColumnVisibility(prev => ({ ...prev, archived: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div>
                          <label htmlFor="deleted-visibility" className="text-sm font-medium text-primary cursor-pointer">Deleted Tasks</label>
                          <p className="text-xs text-muted-foreground">Show deleted tasks (recycle bin)</p>
                        </div>
                      </div>
                      <Switch
                        id="deleted-visibility"
                        checked={tempColumnVisibility.deleted}
                        onCheckedChange={(checked) => setTempColumnVisibility(prev => ({ ...prev, deleted: checked }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-primary">Status Colors</h3>
                    <p className="text-xs text-muted-foreground">Customize header colors for each status column</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(tempStatusColors).map(([status, color]) => (
                        <div key={status} className="flex items-center justify-between p-2 border border-muted rounded-md">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full border border-muted" 
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="text-xs font-medium text-primary capitalize">
                              {status.replace('_', ' ')}
                              {(status === 'archived' || status === 'deleted') && 
                                <span className="text-muted-foreground ml-1">(non-removable)</span>
                              }
                            </span>
                          </div>
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setTempStatusColors(prev => ({ ...prev, [status]: e.target.value }))}
                            className="w-6 h-6 rounded border border-muted cursor-pointer"
                            title={`Change ${status} color`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-muted">
                    <p className="text-xs text-muted-foreground">
                      Note: Archive and Delete status names cannot be modified and are non-removable, 
                      but their header colors can be customized. All other statuses are fully customizable.
                    </p>
                  </div>
                </div>

                {/* Custom Fields Section */}
                <div className="border-t border-muted pt-6">
                  <h3 className="text-sm font-medium text-primary mb-4">Custom Fields</h3>
                  <CustomFieldsSection
                    entityType="board"
                    entityId={boardId}
                    canEdit={true}
                    compact={false}
                  />
                </div>

                {/* Workflow Automation Section */}
                <div className="border-t border-muted pt-6">
                  <h3 className="text-sm font-medium text-primary mb-4">Workflow Automation</h3>
                  <WorkflowBuilder
                    boardId={boardId}
                    onWorkflowCreated={() => {
                      toast.success('Workflow created successfully!');
                    }}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setShowSettings(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    // Apply the temporary settings to actual settings
                    setColumnVisibility(tempColumnVisibility);
                    setStatusColors(tempStatusColors);
                    setShowSettings(false);
                    toast.success('Settings saved!');
                  }}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteBoard}
          title="Delete Board"
          description={`Are you sure you want to delete "${board?.name}"? This will permanently delete ${lists.length} list${lists.length !== 1 ? 's' : ''}, ${tasks.length} task${tasks.length !== 1 ? 's' : ''}, and all associated comments and activities. This action cannot be undone.`}
          confirmText="Delete Board"
          type="danger"
          loading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
} 