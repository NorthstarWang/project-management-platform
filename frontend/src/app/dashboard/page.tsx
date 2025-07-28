'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';
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
import authService from '@/services/authService';
import CreateProjectModal from '@/components/CreateProjectModal';

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
  created_at: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  task_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

interface Activity {
  id: string;
  action_type: string;
  description: string;
  task_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [recentComments, setRecentComments] = useState<Comment[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      trackEvent('DATA_LOAD_START', {
        text: 'User\'s dashboard started loading data for projects, boards, tasks, comments, and activities',
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
      trackEvent('DATA_LOAD_SUCCESS', {
        text: `User\'s dashboard successfully loaded ${projectsRes.data.length} projects, ${boardsRes.data.length} boards, and ${tasksRes.data.length} tasks`,
        page: 'dashboard',
        projects_count: projectsRes.data.length,
        boards_count: boardsRes.data.length,
        tasks_count: tasksRes.data.length
      });

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
      
      // Log data loading error
      trackEvent('DATA_LOAD_ERROR', {
        text: `User\'s dashboard data loading failed: ${error.message || 'Unknown error'}`,
        page: 'dashboard',
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeDashboard = useCallback(async () => {
    try {
      console.log('📊 Dashboard: Starting initialization...');
      
      // Wait for auth service to be ready
      await authService.waitForInitialization();
      console.log('📊 Dashboard: Auth service ready');
      
      // Ensure we have a valid user
      const user = authService.getCurrentUser();
      if (!user) {
        console.log('❌ Dashboard: No user found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('📊 Dashboard: User found:', user.username);
      setUser(user);
      
      // Ensure API client is properly configured
      const isConfigured = authService.ensureApiClientConfigured();
      if (!isConfigured) {
        console.log('❌ Dashboard: API client not configured, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('📊 Dashboard: API client configured');

      // Additional verification: Make a test call to ensure authentication is working
      try {
        console.log('🧪 Dashboard: Testing API authentication...');
        await apiClient.get('/api/users/me');
        console.log('✅ Dashboard: API authentication test passed');
      } catch (authTestError) {
        console.error('❌ Dashboard: API authentication test failed:', authTestError);
        console.log('🔄 Dashboard: Redirecting to login due to auth test failure');
        router.push('/login');
        return;
      }

      console.log('✅ Dashboard: All authentication checks passed');

      // Track user login
      trackEvent('USER_LOGIN', {
        text: `User ${user.username} (${user.role}) logged in and accessed the dashboard`,
        user_id: user.id,
        username: user.username,
        user_role: user.role
      });
      
      // Only load dashboard data after all authentication is confirmed
      console.log('📊 Dashboard: Loading data...');
      await loadDashboardData();
      console.log('✅ Dashboard: Initialization completed successfully');
      
    } catch (error) {
      console.error('❌ Dashboard: Initialization failed:', error);
      router.push('/login');
    }
  }, [router, loadDashboardData]);

  useEffect(() => {
    // Wait for authentication and then load data
    initializeDashboard();
  }, [initializeDashboard]);

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
    trackEvent('QUICK_ACTION_CLICK', {
      text: `User clicked on "${action}" quick action${projectId ? ' for a specific project' : ''}`,
      action,
      project_id: projectId,
      page: 'dashboard'
    });

    // Add more specific synthetic API tracking
    trackEvent('DASHBOARD_INTERACTION', {
      text: `User interacted with dashboard by performing "${action}" action`,
      interaction_type: 'quick_action',
      action_name: action,
      target_project_id: projectId,
      timestamp: new Date().toISOString()
    });

    switch (action) {
      case 'create_project':
        setShowCreateProject(true);
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

  const formatDate = (dateString: string | number) => {
    // Handle Unix timestamp (convert from seconds to milliseconds)
    const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    
    return date.toLocaleDateString('en-US', {
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
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Welcome back, {user.full_name}!
              </h1>
              <p className="text-secondary mt-1">
                Here&apos;s what&apos;s happening with your projects today.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Avatar size="lg" name={user.full_name} className="relative -z-10" />
              <div>
                <p className="text-sm font-medium text-primary">{user.full_name}</p>
                <p className="text-xs text-muted capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary" style={{ marginBottom: '1rem' }}>Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex items-center justify-center space-x-2"
              onClick={() => handleQuickAction('create_project')}
              data-testid="quick-action-create-project"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm">Create Project</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex items-center justify-center space-x-2"
              onClick={() => handleQuickAction('view_all_tasks')}
              data-testid="quick-action-view-tasks"
            >
              <CheckSquare className="h-6 w-6" />
              <span className="text-sm">View All Tasks</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex items-center justify-center space-x-2"
              onClick={() => handleQuickAction('view_calendar')}
              data-testid="quick-action-view-calendar"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Calendar</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex items-center justify-center space-x-2"
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
                <FolderOpen className="h-8 w-8 text-accent" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Projects</p>
                <p className="text-2xl font-semibold text-primary">{projects.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckSquare className="h-8 w-8 text-success" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Boards</p>
                <p className="text-2xl font-semibold text-primary">{boards.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Assigned Tasks</p>
                <p className="text-2xl font-semibold text-primary">{assignedTasks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-info" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted">Active Tasks</p>
                <p className="text-2xl font-semibold text-primary">
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
              <h2 className="text-lg font-semibold text-primary">Recent Projects</h2>
              <Link href="/projects">
                <Button variant="ghost" size="sm" data-testid="view-all-projects" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  View all
                </Button>
              </Link>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton width="75%" />
                    <Skeleton width="50%" size="sm" />
                  </div>
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 3).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleQuickAction('view_project', project.id)}
                    className="block w-full text-left p-3 rounded-lg border border-secondary hover:border-accent hover:bg-interactive-secondary-hover transition-colors"
                    data-testid={`project-card-${project.id}`}
                  >
                    <h3 className="font-medium text-primary">{project.name}</h3>
                    <p className="text-sm text-secondary mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FolderOpen className="mx-auto h-12 w-12 text-muted" />
                <h3 className="mt-2 text-sm font-medium text-primary">No projects</h3>
                <p className="mt-1 text-sm text-muted">
                  You don&apos;t have access to any projects yet.
                </p>
              </div>
            )}
          </Card>

          {/* My Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">My Tasks</h2>
              <Button variant="ghost" size="sm" data-testid="view-all-tasks" rightIcon={<ArrowRight className="h-4 w-4" />}>
                View all
              </Button>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton width="75%" />
                    <Skeleton width="50%" size="sm" />
                  </div>
                ))}
              </div>
            ) : assignedTasks.length > 0 ? (
              <div className="space-y-3">
                {assignedTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-secondary hover:border-accent hover:bg-interactive-secondary-hover transition-colors cursor-pointer"
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-primary">{task.title}</h3>
                        <p className="text-sm text-secondary mt-1 line-clamp-1">
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
                <CheckSquare className="mx-auto h-12 w-12 text-muted" />
                <h3 className="mt-2 text-sm font-medium text-primary">No tasks assigned</h3>
                <p className="mt-1 text-sm text-muted">
                  You don&apos;t have any tasks assigned to you yet.
                </p>
              </div>
            )}
          </Card>

          {/* Recent Comments */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Recent Comments</h2>
              <MessageSquare className="h-5 w-5 text-muted" />
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton width="75%" />
                    <Skeleton width="50%" size="sm" />
                  </div>
                ))}
              </div>
            ) : recentComments.length > 0 ? (
              <div className="space-y-3">
                {recentComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg border border-secondary hover:border-accent hover:bg-interactive-secondary-hover transition-colors"
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="flex items-start space-x-2">
                      <Avatar size="sm" name={comment.user_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {comment.user_name}
                        </p>
                        <p className="text-xs text-muted">
                          commented on task
                        </p>
                      </div>
                      <span className="text-xs text-muted">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-12 w-12 text-muted" />
                <h3 className="mt-2 text-sm font-medium text-primary">No recent comments</h3>
                <p className="mt-1 text-sm text-muted">
                  No comments on your tasks yet.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Recent Activity</h2>
            <Activity className="h-5 w-5 text-muted" />
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <SkeletonAvatar size="md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="75%" />
                    <Skeleton width="50%" size="sm" />
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
                    <div className="h-8 w-8 bg-accent-2 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-accent" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted">{activity.user_name}</span>
                          <span className="text-xs text-muted">•</span>
                          <span className="text-xs text-muted">{formatDate(activity.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Activity className="mx-auto h-12 w-12 text-muted" />
              <h3 className="mt-2 text-sm font-medium text-primary">No recent activity</h3>
              <p className="mt-1 text-sm text-muted">
                Activity will appear here as you work on tasks.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <CreateProjectModal 
          isOpen={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          onProjectCreated={loadDashboardData}
        />
      )}
    </DashboardLayout>
  );
} 