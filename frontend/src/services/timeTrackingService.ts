/**
 * Time & Progress Tracking Service
 * 
 * API client service for time tracking, progress monitoring, and analytics.
 */

import apiClient from './apiClient';
import {
  TimeEntry,
  Timer,
  TaskEstimate,
  TaskProgress,
  WorkPattern,
  SprintBurndown,
  TeamVelocity,
  TimeTrackingAlert,
  TimeSheet,
  ProjectTimebudget,
  CapacityPlan,
  TimeTrackingReport,
  TimeTrackingSettings,
  GitHubIntegration,
  CalendarIntegration,
  CreateTimeEntryRequest,
  StartTimerRequest,
  UpdateProgressRequest,
  GenerateReportRequest,
  TimeEntryFilter,
  TimeTrackingAnalytics,
  TaskTimeSummary,
  UserAvailability,
  VelocityTrend,
  ProjectBudgetStatus,
  TimeEntryStatus,
  EstimateUnit,
  ProgressMetricType,
  ReportType
} from '@/types/time-tracking';

class TimeTrackingService {
  private basePath = '/api/time-tracking';

  // Time Entry Methods

  async createTimeEntry(request: CreateTimeEntryRequest): Promise<TimeEntry> {
    const response = await apiClient.post(`${this.basePath}/entries`, request);
    return response.data;
  }

  async getTimeEntries(filter?: TimeEntryFilter): Promise<TimeEntry[]> {
    const params = new URLSearchParams();
    
    if (filter) {
      if (filter.user_ids?.length) {
        filter.user_ids.forEach(id => params.append('user_ids', id));
      }
      if (filter.task_ids?.length) {
        filter.task_ids.forEach(id => params.append('task_ids', id));
      }
      if (filter.project_ids?.length) {
        filter.project_ids.forEach(id => params.append('project_ids', id));
      }
      if (filter.start_date) params.append('start_date', filter.start_date);
      if (filter.end_date) params.append('end_date', filter.end_date);
      if (filter.status?.length) {
        filter.status.forEach(s => params.append('status', s));
      }
      if (filter.billable !== undefined) params.append('billable', String(filter.billable));
      if (filter.tags?.length) {
        filter.tags.forEach(tag => params.append('tags', tag));
      }
      if (filter.min_duration) params.append('min_duration', String(filter.min_duration));
      if (filter.max_duration) params.append('max_duration', String(filter.max_duration));
    }

    const response = await apiClient.get(`${this.basePath}/entries?${params.toString()}`);
    return response.data;
  }

  async getTimeEntry(entryId: string): Promise<TimeEntry> {
    const response = await apiClient.get(`${this.basePath}/entries/${entryId}`);
    return response.data;
  }

  async updateTimeEntry(entryId: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    const response = await apiClient.put(`${this.basePath}/entries/${entryId}`, updates);
    return response.data;
  }

  async deleteTimeEntry(entryId: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/entries/${entryId}`);
  }

  async approveTimeEntry(entryId: string): Promise<TimeEntry> {
    const response = await apiClient.post(`${this.basePath}/entries/${entryId}/approve`);
    return response.data;
  }

  async rejectTimeEntry(entryId: string, reason: string): Promise<TimeEntry> {
    const response = await apiClient.post(`${this.basePath}/entries/${entryId}/reject`, { reason });
    return response.data;
  }

  // Timer Methods

  async startTimer(request: StartTimerRequest): Promise<Timer> {
    const response = await apiClient.post(`${this.basePath}/timers`, request);
    return response.data;
  }

  async getActiveTimer(): Promise<Timer | null> {
    const response = await apiClient.get(`${this.basePath}/timers/active`);
    return response.data;
  }

  async stopTimer(timerId: string, description?: string): Promise<TimeEntry> {
    const response = await apiClient.post(`${this.basePath}/timers/${timerId}/stop`, { description });
    return response.data;
  }

  async pauseTimer(timerId: string): Promise<Timer> {
    const response = await apiClient.post(`${this.basePath}/timers/${timerId}/pause`);
    return response.data;
  }

  async resumeTimer(timerId: string): Promise<Timer> {
    const response = await apiClient.post(`${this.basePath}/timers/${timerId}/resume`);
    return response.data;
  }

  // Task Estimation & Progress Methods

  async createTaskEstimate(
    taskId: string,
    estimatedValue: number,
    estimateUnit: EstimateUnit,
    confidenceLevel?: number,
    notes?: string
  ): Promise<TaskEstimate> {
    const response = await apiClient.post(`${this.basePath}/tasks/${taskId}/estimate`, {
      estimated_value: estimatedValue,
      estimate_unit: estimateUnit,
      confidence_level: confidenceLevel,
      notes
    });
    return response.data;
  }

  async getTaskEstimates(taskId: string): Promise<TaskEstimate[]> {
    const response = await apiClient.get(`${this.basePath}/tasks/${taskId}/estimates`);
    return response.data;
  }

  async updateTaskProgress(taskId: string, request: Omit<UpdateProgressRequest, 'task_id'>): Promise<TaskProgress> {
    const response = await apiClient.post(`${this.basePath}/tasks/${taskId}/progress`, request);
    return response.data;
  }

  async getTaskProgress(taskId: string, metricType?: ProgressMetricType): Promise<TaskProgress[]> {
    const params = metricType ? `?metric_type=${metricType}` : '';
    const response = await apiClient.get(`${this.basePath}/tasks/${taskId}/progress${params}`);
    return response.data;
  }

  async getTaskTimeSummary(taskId: string): Promise<TaskTimeSummary> {
    const response = await apiClient.get(`${this.basePath}/tasks/${taskId}/time-summary`);
    return response.data;
  }

  // Work Pattern Methods

  async createOrUpdateWorkPattern(pattern: Omit<WorkPattern, 'id' | 'created_at' | 'updated_at'>): Promise<WorkPattern> {
    const response = await apiClient.post(`${this.basePath}/work-patterns`, pattern);
    return response.data;
  }

  async getMyWorkPattern(): Promise<WorkPattern | null> {
    const response = await apiClient.get(`${this.basePath}/work-patterns/me`);
    return response.data;
  }

  async getUserAvailability(userId: string, startDate: string, endDate: string): Promise<UserAvailability> {
    const params = `?start_date=${startDate}&end_date=${endDate}`;
    const response = await apiClient.get(`${this.basePath}/users/${userId}/availability${params}`);
    return response.data;
  }

  // Sprint & Velocity Methods

  async createSprintBurndown(
    sprintId: string,
    projectId: string,
    startDate: string,
    endDate: string,
    totalPoints: number
  ): Promise<SprintBurndown> {
    const response = await apiClient.post(`${this.basePath}/sprints/${sprintId}/burndown`, {
      project_id: projectId,
      start_date: startDate,
      end_date: endDate,
      total_points: totalPoints
    });
    return response.data;
  }

  async updateBurndownProgress(burndownId: string, completedPoints: number): Promise<SprintBurndown> {
    const response = await apiClient.post(`${this.basePath}/burndowns/${burndownId}/progress`, { completed_points: completedPoints });
    return response.data;
  }

  async getProjectBurndowns(projectId: string): Promise<SprintBurndown[]> {
    const response = await apiClient.get(`${this.basePath}/projects/${projectId}/burndowns`);
    return response.data;
  }

  async getTeamVelocityTrend(teamId: string, periods: number = 6): Promise<VelocityTrend> {
    const response = await apiClient.get(`${this.basePath}/teams/${teamId}/velocity?periods=${periods}`);
    return response.data;
  }

  // Timesheet Methods

  async createTimesheet(periodStart: string, periodEnd: string): Promise<TimeSheet> {
    const response = await apiClient.post(`${this.basePath}/timesheets`, {
      period_start: periodStart,
      period_end: periodEnd
    });
    return response.data;
  }

  async getMyTimesheets(status?: TimeEntryStatus): Promise<TimeSheet[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`${this.basePath}/timesheets${params}`);
    return response.data;
  }

  async getTeamTimesheets(teamId: string, status?: TimeEntryStatus): Promise<TimeSheet[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`${this.basePath}/teams/${teamId}/timesheets${params}`);
    return response.data;
  }

  async submitTimesheet(timesheetId: string): Promise<TimeSheet> {
    const response = await apiClient.post(`${this.basePath}/timesheets/${timesheetId}/submit`);
    return response.data;
  }

  async approveTimesheet(timesheetId: string, comment?: string): Promise<TimeSheet> {
    const response = await apiClient.post(`${this.basePath}/timesheets/${timesheetId}/approve`, { comment });
    return response.data;
  }

  async rejectTimesheet(timesheetId: string, reason: string): Promise<TimeSheet> {
    const response = await apiClient.post(`${this.basePath}/timesheets/${timesheetId}/reject`, { reason });
    return response.data;
  }

  // Budget Methods

  async createProjectBudget(projectId: string, budget: Omit<ProjectTimebudget, 'id' | 'project_id' | 'created_at' | 'updated_at'>): Promise<ProjectTimebudget> {
    const response = await apiClient.post(`${this.basePath}/projects/${projectId}/budget`, budget);
    return response.data;
  }

  async getProjectBudgetStatus(projectId: string): Promise<ProjectBudgetStatus> {
    const response = await apiClient.get(`${this.basePath}/projects/${projectId}/budget-status`);
    return response.data;
  }

  // Alert Methods

  async getMyAlerts(acknowledged?: boolean): Promise<TimeTrackingAlert[]> {
    const params = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    const response = await apiClient.get(`${this.basePath}/alerts${params}`);
    return response.data;
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await apiClient.post(`${this.basePath}/alerts/${alertId}/acknowledge`);
  }

  // Analytics & Reporting Methods

  async generateReport(request: GenerateReportRequest): Promise<TimeTrackingReport> {
    const response = await apiClient.post(`${this.basePath}/reports`, request);
    return response.data;
  }

  async getMyReports(): Promise<TimeTrackingReport[]> {
    const response = await apiClient.get(`${this.basePath}/reports`);
    return response.data;
  }

  async getMyAnalytics(startDate: string, endDate: string): Promise<TimeTrackingAnalytics> {
    const params = `?start_date=${startDate}&end_date=${endDate}`;
    const response = await apiClient.get(`${this.basePath}/analytics/me${params}`);
    return response.data;
  }

  async getUserAnalytics(userId: string, startDate: string, endDate: string): Promise<TimeTrackingAnalytics> {
    const params = `?start_date=${startDate}&end_date=${endDate}`;
    const response = await apiClient.get(`${this.basePath}/analytics/users/${userId}${params}`);
    return response.data;
  }

  // Settings Methods

  async getTimeTrackingSettings(entityType: string, entityId: string): Promise<TimeTrackingSettings | null> {
    const response = await apiClient.get(`${this.basePath}/settings/${entityType}/${entityId}`);
    return response.data;
  }

  async updateTimeTrackingSettings(
    entityType: string,
    entityId: string,
    settings: Omit<TimeTrackingSettings, 'id' | 'entity_type' | 'entity_id' | 'created_at' | 'updated_at'>
  ): Promise<TimeTrackingSettings> {
    const response = await apiClient.put(`${this.basePath}/settings/${entityType}/${entityId}`, settings);
    return response.data;
  }

  // Integration Methods

  async setupGitHubIntegration(githubUsername: string, autoTrackCommits: boolean = true): Promise<GitHubIntegration> {
    const response = await apiClient.post(`${this.basePath}/integrations/github`, {
      github_username: githubUsername,
      auto_track_commits: autoTrackCommits
    });
    return response.data;
  }

  async setupCalendarIntegration(calendarType: string, calendarId: string): Promise<CalendarIntegration> {
    const response = await apiClient.post(`${this.basePath}/integrations/calendar`, {
      calendar_type: calendarType,
      calendar_id: calendarId
    });
    return response.data;
  }

  // Capacity Planning Methods

  async createCapacityPlan(
    teamId: string,
    startDate: string,
    endDate: string,
    teamMemberIds: string[]
  ): Promise<CapacityPlan> {
    const response = await apiClient.post(`${this.basePath}/teams/${teamId}/capacity-plan`, {
      start_date: startDate,
      end_date: endDate,
      team_member_ids: teamMemberIds
    });
    return response.data;
  }

  async getTeamCapacityPlans(teamId: string): Promise<CapacityPlan[]> {
    const response = await apiClient.get(`${this.basePath}/teams/${teamId}/capacity-plans`);
    return response.data;
  }

  // Utility Methods

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  calculateDuration(startTime: string, endTime?: string): number {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    return Math.floor((end - start) / (1000 * 60)); // minutes
  }

  getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Saturday
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }

  getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }
}

const timeTrackingService = new TimeTrackingService();
export default timeTrackingService;