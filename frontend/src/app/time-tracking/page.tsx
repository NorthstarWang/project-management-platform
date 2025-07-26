'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/CustomToast';
import {
  Clock,
  Calendar,
  TrendingUp,
  DollarSign,
  Activity,
  Download,
  Settings,
  AlertCircle,
  BarChart3,
  Timer,
  Target,
  Users
} from 'lucide-react';
import timeTrackingService from '@/services/timeTrackingService';
import { TimeTracker } from '@/components/time-tracking/TimeTracker';
import { TimeEntryList } from '@/components/time-tracking/TimeEntryList';
import {
  TimeTrackingAnalytics,
  TimeTrackingAlert,
  ReportType,
  TimeEntryStatus
} from '@/types/time-tracking';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

export default function TimeTrackingDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'entries' | 'reports' | 'settings'>('overview');
  const [dateRange, setDateRange] = useState(() => {
    const { start, end } = timeTrackingService.getWeekRange();
    return { start, end };
  });
  const [analytics, setAnalytics] = useState<TimeTrackingAnalytics | null>(null);
  const [alerts, setAlerts] = useState<TimeTrackingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timesheetStatus, setTimesheetStatus] = useState<{
    current?: any;
    needsSubmission: boolean;
  }>({ needsSubmission: false });

  const loadDashboardData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      
      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];
      
      const [analyticsData, alertsData, timesheets] = await Promise.all([
        timeTrackingService.getMyAnalytics(startStr, endStr),
        timeTrackingService.getMyAlerts(false),
        timeTrackingService.getMyTimesheets()
      ]);
      
      setAnalytics(analyticsData);
      setAlerts(alertsData);
      
      // Check timesheet status
      const currentPeriodTimesheet = timesheets.find(ts => 
        ts.status === TimeEntryStatus.DRAFT || ts.status === TimeEntryStatus.SUBMITTED
      );
      
      setTimesheetStatus({
        current: currentPeriodTimesheet,
        needsSubmission: currentPeriodTimesheet?.status === TimeEntryStatus.DRAFT
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadDashboardData(parsedUser.id);
  }, [router, loadDashboardData]);

  useEffect(() => {
    if (user) {
      loadDashboardData(user.id);
    }
  }, [dateRange, user, loadDashboardData]);

  const handleDateRangeChange = (type: 'week' | 'month' | 'custom', customRange?: { start: Date; end: Date }) => {
    if (type === 'week') {
      setDateRange(timeTrackingService.getWeekRange());
    } else if (type === 'month') {
      setDateRange(timeTrackingService.getMonthRange());
    } else if (customRange) {
      setDateRange(customRange);
    }
  };

  const handleGenerateReport = async (reportType: ReportType) => {
    try {
      const report = await timeTrackingService.generateReport({
        report_type: reportType,
        name: `${reportType} Report - ${new Date().toLocaleDateString()}`,
        parameters: {
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0],
          user_id: user?.id
        },
        format: 'json'
      });
      
      toast.success('Report generated successfully');
      // In a real app, you might download or display the report
      console.log('Generated report:', report);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await timeTrackingService.acknowledgeAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
      toast.success('Alert acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const renderOverviewTab = () => {
    if (!analytics) return null;

    const productivityColor = (score: number) => {
      if (score >= 80) return 'text-success';
      if (score >= 60) return 'text-warning';
      return 'text-error';
    };

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Hours</p>
                <p className="text-2xl font-bold text-primary">
                  {timeTrackingService.formatDuration(analytics.total_tracked_hours * 60)}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {analytics.average_daily_hours.toFixed(1)}h daily avg
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Billable Hours</p>
                <p className="text-2xl font-bold text-success">
                  {timeTrackingService.formatDuration(analytics.billable_hours * 60)}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {((analytics.billable_hours / analytics.total_tracked_hours) * 100).toFixed(0)}% billable
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-success opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Productivity Score</p>
                <p className={`text-2xl font-bold ${productivityColor(analytics.productivity_score || 0)}`}>
                  {(analytics.productivity_score || 0).toFixed(0)}%
                </p>
                <p className="text-xs text-secondary mt-1">
                  Based on consistency
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-info opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Active Alerts</p>
                <p className="text-2xl font-bold text-warning">
                  {alerts.length}
                </p>
                <p className="text-xs text-secondary mt-1">
                  Require attention
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-warning opacity-50" />
            </div>
          </Card>
        </div>

        {/* Current Timer */}
        <TimeTracker compact={false} onTimeEntryCreated={() => loadDashboardData(user!.id)} />

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Active Alerts
            </h3>
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border flex items-start justify-between ${
                    alert.severity === 'critical' ? 'border-error bg-error/5' :
                    alert.severity === 'high' ? 'border-warning bg-warning/5' :
                    'border-secondary bg-secondary/5'
                  }`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-primary">{alert.title}</h4>
                    <p className="text-sm text-secondary mt-1">{alert.message}</p>
                    <p className="text-xs text-muted mt-2">
                      {timeTrackingService.formatDate(alert.created_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Time Distribution */}
        {analytics.most_tracked_project || analytics.most_tracked_task ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Top Activities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.most_tracked_project && (
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted mb-1">Most Tracked Project</p>
                  <p className="font-medium text-primary">Project #{analytics.most_tracked_project.project_id.slice(0, 8)}</p>
                  <p className="text-lg font-semibold text-accent mt-1">
                    {timeTrackingService.formatDuration(analytics.most_tracked_project.hours * 60)}
                  </p>
                </div>
              )}
              {analytics.most_tracked_task && (
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted mb-1">Most Tracked Task</p>
                  <p className="font-medium text-primary">Task #{analytics.most_tracked_task.task_id.slice(0, 8)}</p>
                  <p className="text-lg font-semibold text-accent mt-1">
                    {timeTrackingService.formatDuration(analytics.most_tracked_task.hours * 60)}
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : null}

        {/* Timesheet Status */}
        {timesheetStatus.needsSubmission && (
          <Card className="p-6 border-warning bg-warning/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-warning mr-3" />
                <div>
                  <h4 className="font-medium text-primary">Timesheet Ready for Submission</h4>
                  <p className="text-sm text-secondary mt-1">
                    Your timesheet for the period {timeTrackingService.formatDate(timesheetStatus.current.period_start)} to{' '}
                    {timeTrackingService.formatDate(timesheetStatus.current.period_end)} is ready to submit.
                  </p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await timeTrackingService.submitTimesheet(timesheetStatus.current.id);
                    toast.success('Timesheet submitted successfully');
                    loadDashboardData(user!.id);
                  } catch (error) {
                    toast.error('Failed to submit timesheet');
                  }
                }}
              >
                Submit Timesheet
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderReportsTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Generate Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => handleGenerateReport(ReportType.TIMESHEET)}
            className="p-4 border border-secondary rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-left"
          >
            <BarChart3 className="h-8 w-8 text-accent mb-2" />
            <h4 className="font-medium text-primary">Timesheet Report</h4>
            <p className="text-sm text-secondary mt-1">Detailed time entries for the period</p>
          </button>
          
          <button
            onClick={() => handleGenerateReport(ReportType.UTILIZATION)}
            className="p-4 border border-secondary rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-left"
          >
            <Activity className="h-8 w-8 text-accent mb-2" />
            <h4 className="font-medium text-primary">Utilization Report</h4>
            <p className="text-sm text-secondary mt-1">Time utilization and productivity metrics</p>
          </button>
          
          <button
            onClick={() => handleGenerateReport(ReportType.BUDGET)}
            className="p-4 border border-secondary rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-left"
          >
            <DollarSign className="h-8 w-8 text-accent mb-2" />
            <h4 className="font-medium text-primary">Budget Report</h4>
            <p className="text-sm text-secondary mt-1">Time vs budget analysis</p>
          </button>
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton height="120px" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton height="120px" />
            <Skeleton height="120px" />
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </div>
          <Skeleton height="300px" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-card p-6 border border-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center">
                <Timer className="h-8 w-8 mr-3" />
                Time Tracking
              </h1>
              <p className="text-secondary mt-1">Track your time and monitor productivity</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value=""
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'week') handleDateRangeChange('week');
                  else if (value === 'month') handleDateRangeChange('month');
                }}
                className="w-40 h-10 px-3 py-2 text-sm rounded-md border border-input bg-input text-input cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                <option value="">Custom Range</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              
              <div className="flex items-center space-x-2">
                <DatePicker
                  value={dateRange.start}
                  onChange={(date) => date && setDateRange({ ...dateRange, start: date })}
                />
                <span className="text-muted">to</span>
                <DatePicker
                  value={dateRange.end}
                  onChange={(date) => date && setDateRange({ ...dateRange, end: date })}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-secondary -mb-6 -mx-6 px-6">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-accent text-accent font-medium'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <Activity className="h-4 w-4 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('entries')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'entries'
                    ? 'border-accent text-accent font-medium'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Time Entries
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'reports'
                    ? 'border-accent text-accent font-medium'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Reports
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'border-accent text-accent font-medium'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'entries' && (
            <TimeEntryList
              userId={user?.id}
              showFilters={true}
              showSummary={true}
              onEntryUpdated={() => loadDashboardData(user!.id)}
            />
          )}
          {activeTab === 'reports' && renderReportsTab()}
          {activeTab === 'settings' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Time Tracking Settings</h3>
              <p className="text-secondary">Settings configuration coming soon...</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}