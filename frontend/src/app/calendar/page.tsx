'use client';

import { useState, useEffect } from 'react';
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
  Filter
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

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Log calendar page view
    track('PAGE_VIEW', {
      page_name: 'calendar',
      page_url: '/calendar',
      user_id: parsedUser.id,
      user_role: parsedUser.role,
      view_mode: viewMode
    });
    
    // Load calendar data
    loadCalendarData();
  }, [router, viewMode]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      
      // Log data loading start
      track('DATA_LOAD_START', {
        page: 'calendar',
        data_types: ['tasks_with_due_dates'],
        view_mode: viewMode
      });
      
      // Load tasks with due dates
      const tasksResponse = await apiClient.get('/api/users/me/assigned_tasks');
      const allTasks = tasksResponse.data;
      
      // Filter tasks that have due dates
      const tasksWithDueDates = allTasks.filter((task: Task) => task.due_date);
      setTasks(tasksWithDueDates);

      // Log successful data load
      track('DATA_LOAD_SUCCESS', {
        page: 'calendar',
        tasks_count: tasksWithDueDates.length,
        view_mode: viewMode
      });

    } catch (error: any) {
      console.error('Failed to load calendar data:', error);
      toast.error('Failed to load calendar data');
      
      // Log data loading error
      track('DATA_LOAD_ERROR', {
        page: 'calendar',
        error: error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (mode: 'month' | 'week') => {
    setViewMode(mode);
    
    // Log view mode change
    track('VIEW_MODE_CHANGE', {
      page: 'calendar',
      old_mode: viewMode,
      new_mode: mode
    });
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    
    setCurrentDate(newDate);
    
    // Log date navigation
    track('DATE_NAVIGATION', {
      page: 'calendar',
      direction,
      view_mode: viewMode,
      new_date: newDate.toISOString()
    });
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
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isToday = (dateString: string) => {
    const taskDate = new Date(dateString);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  };

  const isOverdue = (dateString: string) => {
    const taskDate = new Date(dateString);
    const today = new Date();
    return taskDate < today;
  };

  const getCurrentMonthName = () => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getUpcomingTasks = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return tasks
      .filter(task => {
        const taskDate = new Date(task.due_date);
        return taskDate >= today && taskDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
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
                <h1 className="text-2xl font-bold text-primary">Calendar</h1>
                <p className="text-secondary mt-1">
                  View your tasks and deadlines
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-gray-2 rounded-lg p-1">
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
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateNavigation('prev')}
                data-testid="prev-date-button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-primary">
                {getCurrentMonthName()}
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
                {tasks.length} tasks with due dates
              </span>
            </div>
          </div>

          {/* Calendar Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Upcoming Tasks (Next 7 Days)
                </h3>
                {getUpcomingTasks().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getUpcomingTasks().map((task) => (
                      <Card
                        key={task.id}
                        className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                          isOverdue(task.due_date) ? 'border-error bg-error' :
                          isToday(task.due_date) ? 'border-warning bg-warning' :
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
                        You don&apos;t have any tasks due in the next 7 days.
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* All Tasks with Due Dates */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">
                  All Tasks with Due Dates
                </h3>
                {tasks.length > 0 ? (
                  <div className="space-y-2">
                    {tasks
                      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                      .map((task) => (
                        <Card
                          key={task.id}
                          className={`p-4 hover:shadow-sm transition-shadow cursor-pointer ${
                            isOverdue(task.due_date) ? 'border-red-200 bg-red-50' :
                            isToday(task.due_date) ? 'border-yellow-200 bg-yellow-50' :
                            'border-gray-200'
                          }`}
                          data-testid={`all-tasks-${task.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <h4 className="font-medium text-gray-900">{task.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-1">{task.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant={getPriorityColor(task.priority)} size="sm">
                                {task.priority}
                              </Badge>
                              <Badge variant={getStatusColor(task.status)} size="sm">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <div className="text-sm text-gray-500">
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
                      <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks with due dates</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Tasks with due dates will appear here.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
} 