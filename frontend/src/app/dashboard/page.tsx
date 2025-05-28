'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { 
  FolderOpen, 
  CheckSquare, 
  Clock, 
  Users,
  ArrowRight,
  Plus,
  MessageSquare,
  Calendar,
  Activity
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { track } from '@/services/analyticsLogger';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  team_id: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date?: string;
  list_id: string;
  assignee_id: string;
  created_at: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
}

interface Comment {
  id: string;
  content: string;
  task_id: string;
  author_id: string;
  author_name: string;
  created_at: string;
  task_title: string;
}

interface Activity {
  id: string;
  task_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  task_title: string;
  user_name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [recentComments, setRecentComments] = useState<Comment[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

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
    
    // Log dashboard page view
    track('PAGE_VIEW', {
      page_name: 'dashboard',
      page_url: '/dashboard',
      user_id: parsedUser.id,
      user_role: parsedUser.role
    });
    
    // Load dashboard data
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      track('DATA_LOAD_START', {
        page: 'dashboard',
        data_types: ['projects', 'boards', 'tasks', 'comments', 'activities']
      });
      
      // Load user's projects, boards, and assigned tasks in parallel
      const [projectsRes, boardsRes, tasksRes] = await Promise.all([
        apiClient.get('/api/projects'),
        apiClient.get('/api/users/me/boards'),
        apiClient.get('/api/users/me/assigned_tasks')
      ]);

      setProjects(projectsRes.data);
      setBoards(boardsRes.data);
      setAssignedTasks(tasksRes.data);

      // Load recent comments and activities for assigned tasks
      if (tasksRes.data.length > 0) {
        await loadRecentCommentsAndActivities(tasksRes.data);
      }

      // Log successful data load
      track('DATA_LOAD_SUCCESS', {
        page: 'dashboard',
        projects_count: projectsRes.data.length,
        boards_count: boardsRes.data.length,
        tasks_count: tasksRes.data.length
      });

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
      
      // Log data loading error
      track('DATA_LOAD_ERROR', {
        page: 'dashboard',
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentCommentsAndActivities = async (tasks: Task[]) => {
    try {
      // Get comments and activities for user's tasks
      const commentsPromises = tasks.slice(0, 5).map(task => 
        apiClient.get(`/api/tasks/${task.id}/comments`).catch(() => ({ data: [] }))
      );
      const activitiesPromises = tasks.slice(0, 5).map(task => 
        apiClient.get(`/api/tasks/${task.id}/activities`).catch(() => ({ data: [] }))
      );

      const [commentsResults, activitiesResults] = await Promise.all([
        Promise.all(commentsPromises),
        Promise.all(activitiesPromises)
      ]);

      // Flatten and sort comments
      const allComments = commentsResults
        .flatMap((result, index) => 
          result.data.map((comment: any) => ({
            ...comment,
            task_title: tasks[index]?.title || 'Unknown Task'
          }))
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Flatten and sort activities
      const allActivities = activitiesResults
        .flatMap((result, index) => 
          result.data.map((activity: any) => ({
            ...activity,
            task_title: tasks[index]?.title || 'Unknown Task'
          }))
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setRecentComments(allComments);
      setRecentActivities(allActivities);
    } catch (error) {
      console.error('Failed to load comments and activities:', error);
    }
  };

  const handleQuickAction = (action: string, projectId?: string) => {
    track('QUICK_ACTION_CLICK', {
      action,
      project_id: projectId,
      page: 'dashboard'
    });

    switch (action) {
      case 'create_project':
        // TODO: Open create project modal
        toast.info('Create project functionality coming soon');
        break;
      case 'view_project':
        if (projectId) {
          router.push(`/projects/${projectId}`);
        }
        break;
      case 'view_all_tasks':
        // TODO: Navigate to tasks page
        toast.info('All tasks view coming soon');
        break;
      case 'view_calendar':
        router.push('/calendar');
        break;
      default:
        break;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'done';
      case 'in_progress': return 'progress';
      case 'todo': return 'todo';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.full_name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here&apos;s what&apos;s happening with your projects today.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Avatar size="lg" name={user.full_name} />
              <div>
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('create_project')}
              data-testid="quick-action-create-project"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm">Create Project</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('view_all_tasks')}
              data-testid="quick-action-view-tasks"
            >
              <CheckSquare className="h-6 w-6" />
              <span className="text-sm">View All Tasks</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('view_calendar')}
              data-testid="quick-action-view-calendar"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Calendar</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push('/members')}
              data-testid="quick-action-view-members"
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Team Members</span>
            </Button>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Projects</p>
                <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Boards</p>
                <p className="text-2xl font-semibold text-gray-900">{boards.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Assigned Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{assignedTasks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {assignedTasks.filter(task => task.status !== 'completed').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
              <Link href="/projects">
                <Button variant="ghost" size="sm" data-testid="view-all-projects">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 3).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleQuickAction('view_project', project.id)}
                    className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    data-testid={`project-card-${project.id}`}
                  >
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don&apos;t have access to any projects yet.
                </p>
              </div>
            )}
          </Card>

          {/* My Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
              <Button variant="ghost" size="sm" data-testid="view-all-tasks">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : assignedTasks.length > 0 ? (
              <div className="space-y-3">
                {assignedTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1 ml-3">
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don&apos;t have any tasks assigned to you yet.
                </p>
              </div>
            )}
          </Card>

          {/* Recent Comments */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Comments</h2>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentComments.length > 0 ? (
              <div className="space-y-3">
                {recentComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="flex items-start space-x-2">
                      <Avatar size="xs" name={comment.author_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 line-clamp-2">
                          {comment.content}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{comment.task_title}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent comments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No comments on your tasks yet.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user_name}</span>{' '}
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">{activity.task_title}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{formatDate(activity.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activity will appear here as you work on tasks.
              </p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
} 