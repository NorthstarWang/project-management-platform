'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Filter,
  Users
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from '@/components/ui/CustomToast';
import { track } from '@/services/analyticsLogger';
import { Switch } from '@/components/ui/Switch';

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
  priority: string;
  status: string;
  due_date: string;
  assignee_id?: string;
  assignee_name?: string;
  project_name?: string;
  board_name?: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [showTeamTasks, setShowTeamTasks] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isTeamManager, setIsTeamManager] = useState(false);

  const checkIfTeamManager = async () => {
    try {
      const response = await apiClient.get('/api/users/me/teams');
      const userTeams = response.data;
      
      // Check if user is a manager or admin in any team
      const isManager = userTeams.some((team: any) => 
        team.user_role === 'manager' || team.user_role === 'admin'
      );
      
      setIsTeamManager(isManager);
    } catch (error) {
      console.error('Failed to check team manager status:', error);
    }
  };

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      track('DATA_LOAD_START', {
        text: 'Started loading calendar tasks data',
        page: 'calendar',
        data_types: ['tasks_with_due_dates'],
        view_mode: viewMode,
        show_team_tasks: showTeamTasks
      });
      
      let allTasks: Task[] = [];
      
      if (showTeamTasks && user && (isTeamManager || user.role === 'admin')) {
        // Load team tasks for managers by first getting team members, then their tasks
        try {
          // Get team members
          const teamMembersResponse = await apiClient.get('/api/users/me/team-members');
          const teamMembers = teamMembersResponse.data;
          
          // Get tasks for each team member
          const taskPromises = teamMembers.map((member: any) => 
            apiClient.get(`/api/users/${member.id}/assigned_tasks`)
              .then(response => ({
                tasks: response.data,
                member: member
              }))
              .catch((error) => {
                console.error(`Failed to load tasks for ${member.full_name}:`, error);
                return { tasks: [], member: member };
              })
          );
          
          const taskResults = await Promise.all(taskPromises);
          
          // Combine all team tasks and add assignee information
          allTasks = taskResults.flatMap(result => 
            result.tasks.map((task: any) => ({
              ...task,
              assignee_id: result.member.id,
              assignee_name: result.member.full_name
            }))
          );
          
        } catch (error) {
          console.error('Failed to load team tasks:', error);
          // Fallback to personal tasks if team tasks fail
          const tasksResponse = await apiClient.get('/api/users/me/assigned_tasks');
          allTasks = tasksResponse.data;
        }
      } else {
        // Load personal tasks
        const tasksResponse = await apiClient.get('/api/users/me/assigned_tasks');
        allTasks = tasksResponse.data;
      }
      
      // Filter tasks that have due dates
      const tasksWithDueDates = allTasks.filter((task: Task) => task.due_date);
      setTasks(tasksWithDueDates);

      // Log successful data load
      track('DATA_LOAD_SUCCESS', {
        text: `Successfully loaded ${tasksWithDueDates.length} calendar tasks`,
        page: 'calendar',
        tasks_count: tasksWithDueDates.length,
        view_mode: viewMode,
        show_team_tasks: showTeamTasks
      });

    } catch (error: any) {
      console.error('Failed to load calendar data:', error);
      toast.error('Failed to load calendar data');
      
      // Log data loading error
      track('DATA_LOAD_ERROR', {
        text: 'Failed to load calendar tasks data',
        page: 'calendar',
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, [viewMode, showTeamTasks, user, isTeamManager]);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Check if user is a manager of any team
    checkIfTeamManager();
    
    // Log calendar page view
    track('PAGE_VIEW', {
      text: `User viewed calendar page in ${viewMode} mode`,
      page_name: 'calendar',
      page_url: '/calendar',
      user_id: parsedUser.id,
      user_role: parsedUser.role,
      view_mode: viewMode
    });
  }, [router, viewMode]);

  useEffect(() => {
    if (user) {
      loadCalendarData();
    }
  }, [user, viewMode, showTeamTasks, loadCalendarData]);

  const handleViewModeChange = async (mode: 'month' | 'week') => {
    if (mode === viewMode) return;
    
    setIsTransitioning(true);
    setViewMode(mode);
    
    // Log view mode change
    track('VIEW_MODE_CHANGE', {
      text: `Changed calendar view from ${viewMode} to ${mode}`,
      page: 'calendar',
      old_mode: viewMode,
      new_mode: mode
    });
    
    // Small delay to show transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const handleDateNavigation = async (direction: 'prev' | 'next') => {
    setIsTransitioning(true);
    const newDate = new Date(currentDate);
    
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    
    setCurrentDate(newDate);
    
    // Log date navigation
    track('DATE_NAVIGATION', {
      text: `Navigated calendar ${direction === 'next' ? 'forward' : 'backward'} in ${viewMode} view`,
      page: 'calendar',
      direction,
      view_mode: viewMode,
      new_date: newDate.toISOString()
    });
    
    // Small delay to show transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
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
      case 'review': return 'warning'; // Changed from secondary for better contrast
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string | number) => {
    // Handle Unix timestamp (convert from seconds to milliseconds)
    const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string | number) => {
    // Handle Unix timestamp (convert from seconds to milliseconds)
    const timestamp = typeof dateString === 'string' ? parseFloat(dateString) : dateString;
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (dateString: string) => {
    const taskDate = new Date(parseFloat(dateString) * 1000);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  };

  const isOverdue = (dateString: string) => {
    const taskDate = new Date(parseFloat(dateString) * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  };

  const getCurrentMonthName = () => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getCurrentWeekRange = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getUpcomingTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (viewMode === 'month') {
      // In month view, show tasks from today until end of current month
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      return tasks
        .filter(task => {
          const taskDate = new Date(parseFloat(task.due_date) * 1000);
          return taskDate >= today && taskDate <= endOfMonth;
        })
        .sort((a, b) => new Date(parseFloat(a.due_date) * 1000).getTime() - new Date(parseFloat(b.due_date) * 1000).getTime());
    } else {
      // In week view, show next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      return tasks
        .filter(task => {
          const taskDate = new Date(parseFloat(task.due_date) * 1000);
          return taskDate >= today && taskDate <= nextWeek;
        })
        .sort((a, b) => new Date(parseFloat(a.due_date) * 1000).getTime() - new Date(parseFloat(b.due_date) * 1000).getTime());
    }
  };

  const getMonthTasks = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    return tasks
      .filter(task => {
        const taskDate = new Date(parseFloat(task.due_date) * 1000);
        return taskDate >= startOfMonth && taskDate <= endOfMonth;
      })
      .sort((a, b) => new Date(parseFloat(a.due_date) * 1000).getTime() - new Date(parseFloat(b.due_date) * 1000).getTime());
  };

  const getWeekTasks = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return tasks
      .filter(task => {
        const taskDate = new Date(parseFloat(task.due_date) * 1000);
        return taskDate >= startOfWeek && taskDate <= endOfWeek;
      })
      .sort((a, b) => new Date(parseFloat(a.due_date) * 1000).getTime() - new Date(parseFloat(b.due_date) * 1000).getTime());
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-8 w-8 text-accent" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-primary">Calendar</h1>
                  {showTeamTasks && (
                    <Badge variant="default" size="sm">
                      Team View
                    </Badge>
                  )}
                </div>
                <p className="text-secondary mt-1">
                  {showTeamTasks ? 'View your team\'s tasks and deadlines' : 'View your tasks and deadlines'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Team Tasks Toggle for Managers */}
              {user && (isTeamManager || user.role === 'admin') && (
                <div className="flex items-center space-x-2 mr-4">
                  <Users className="h-4 w-4 text-muted" />
                  <span className="text-sm text-secondary">Team Tasks</span>
                  <Switch
                    checked={showTeamTasks}
                    onCheckedChange={setShowTeamTasks}
                    aria-label="Toggle team tasks"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-1 bg-surface rounded-lg p-1">
                <Button
                  variant={viewMode === 'month' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('month')}
                  data-testid="month-view-button"
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewModeChange('week')}
                  data-testid="week-view-button"
                >
                  Week
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateNavigation('prev')}
                data-testid="prev-date-button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-primary px-4 min-w-[280px] text-center" style={{ margin: 0 }}>
                {viewMode === 'month' ? getCurrentMonthName() : getCurrentWeekRange()}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateNavigation('next')}
                data-testid="next-date-button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted" />
              <span className="text-sm text-secondary">
                {viewMode === 'month' ? getMonthTasks().length : getWeekTasks().length} tasks in {viewMode === 'month' ? 'month' : 'week'}
              </span>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="relative min-h-[400px]">
            {(loading || isTransitioning) && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto"></div>
                  <p className="mt-3 text-sm text-muted">{loading ? 'Loading tasks...' : 'Updating view...'}</p>
                </div>
              </div>
            )}
            <div className={`space-y-8 transition-opacity duration-300 ${loading || isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
              {/* Upcoming Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-primary" style={{ marginBottom: '1.5rem' }}>
                  {showTeamTasks ? 'Team ' : ''}Upcoming Tasks {viewMode === 'month' ? `(Rest of ${getCurrentMonthName()})` : '(Next 7 Days)'}
                </h3>
                {getUpcomingTasks().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getUpcomingTasks().map((task) => (
                      <Card
                        key={task.id}
                        className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                          isOverdue(task.due_date) ? 'border-error bg-error/10' :
                          isToday(task.due_date) ? 'border-warning bg-warning/10' :
                          'border-card'
                        }`}
                        data-testid={`calendar-task-${task.id}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-primary text-sm leading-tight">
                              {task.title}
                            </h4>
                            {isOverdue(task.due_date) && (
                              <Badge variant="destructive" size="sm">
                                Overdue
                              </Badge>
                            )}
                            {isToday(task.due_date) && (
                              <Badge variant="warning" size="sm">
                                Today
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge variant={getPriorityColor(task.priority)} size="sm">
                              {task.priority}
                            </Badge>
                            <Badge variant={getStatusColor(task.status)} size="sm">
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-muted">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(task.due_date)}</span>
                            <span>•</span>
                            <span>{formatTime(task.due_date)}</span>
                          </div>

                          {task.assignee_name && (
                            <div className="flex items-center space-x-2">
                              <Avatar size="xs" name={task.assignee_name} />
                              <span className="text-xs text-secondary">{task.assignee_name}</span>
                            </div>
                          )}

                          {(task.project_name || task.board_name) && (
                            <div className="text-xs text-muted">
                              {task.project_name && (
                                <span>Project: {task.project_name}</span>
                              )}
                              {task.project_name && task.board_name && <span> • </span>}
                              {task.board_name && (
                                <span>Board: {task.board_name}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12">
                    <div className="text-center">
                      <CalendarIcon className="mx-auto h-12 w-12 text-muted" />
                      <h3 className="mt-2 text-sm font-medium text-primary">No upcoming tasks</h3>
                      <p className="mt-1 text-sm text-muted">
                        {showTeamTasks 
                          ? "Your team doesn't have any tasks due in the next 7 days."
                          : "You don't have any tasks due in the next 7 days."
                        }
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Monthly/Weekly Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-primary" style={{ marginBottom: '1.5rem' }}>
                  {showTeamTasks ? 'Team ' : ''}{viewMode === 'month' ? `All Tasks in ${getCurrentMonthName()}` : `Tasks for Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </h3>
                {(viewMode === 'month' ? getMonthTasks() : getWeekTasks()).length > 0 ? (
                  <div className="space-y-2">
                    {(viewMode === 'month' ? getMonthTasks() : getWeekTasks())
                      .map((task) => (
                        <Card
                          key={task.id}
                          className={`p-4 hover:shadow-sm transition-shadow cursor-pointer ${
                            isOverdue(task.due_date) ? 'border-error bg-error/10' :
                            isToday(task.due_date) ? 'border-warning bg-warning/10' :
                            'border-card'
                          }`}
                          data-testid={`all-tasks-${task.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <h4 className="font-medium text-primary">{task.title}</h4>
                                <p className="text-sm text-secondary line-clamp-1">{task.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant={getPriorityColor(task.priority)} size="sm">
                                {task.priority}
                              </Badge>
                              <Badge variant={getStatusColor(task.status)} size="sm">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <div className="text-sm text-muted">
                                {formatDate(task.due_date)}
                              </div>
                              {task.assignee_name && (
                                <Avatar size="sm" name={task.assignee_name} />
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <Card className="p-12">
                    <div className="text-center">
                      <CalendarIcon className="mx-auto h-12 w-12 text-muted" />
                      <h3 className="mt-2 text-sm font-medium text-primary">No tasks in this {viewMode}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {showTeamTasks 
                          ? "Your team's tasks with due dates will appear here."
                          : "Tasks with due dates will appear here."
                        }
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
} 