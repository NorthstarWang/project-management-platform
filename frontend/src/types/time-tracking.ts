/**
 * Time & Progress Tracking System Types
 * 
 * Comprehensive type definitions for time tracking, progress monitoring,
 * and analytics functionality.
 */

// Enums

export enum TimeEntryStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BILLED = 'billed'
}

export enum TimerState {
  STOPPED = 'stopped',
  RUNNING = 'running',
  PAUSED = 'paused'
}

export enum WorkPatternType {
  STANDARD = 'standard',
  FLEXIBLE = 'flexible',
  SHIFT = 'shift',
  CUSTOM = 'custom'
}

export enum ProgressMetricType {
  PERCENTAGE = 'percentage',
  COUNT = 'count',
  STORY_POINTS = 'story_points',
  TIME_BASED = 'time_based',
  MILESTONE = 'milestone',
  CUSTOM = 'custom'
}

export enum EstimateUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  STORY_POINTS = 'story_points'
}

export enum BurndownType {
  SPRINT = 'sprint',
  RELEASE = 'release',
  PROJECT = 'project',
  EPIC = 'epic'
}

export enum VelocityPeriod {
  SPRINT = 'sprint',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter'
}

export enum AlertType {
  OVERTIME = 'overtime',
  UNDERTIME = 'undertime',
  DEADLINE_APPROACHING = 'deadline_approaching',
  DEADLINE_MISSED = 'deadline_missed',
  BUDGET_EXCEEDED = 'budget_exceeded',
  VELOCITY_DROP = 'velocity_drop',
  BURNDOWN_OFF_TRACK = 'burndown_off_track'
}

export enum ReportType {
  TIMESHEET = 'timesheet',
  UTILIZATION = 'utilization',
  BURNDOWN = 'burndown',
  VELOCITY = 'velocity',
  FORECAST = 'forecast',
  BUDGET = 'budget',
  TEAM_CAPACITY = 'team_capacity'
}

export enum BudgetAlertType {
  THRESHOLD_REACHED = 'threshold_reached',
  BUDGET_EXCEEDED = 'budget_exceeded',
  BURN_RATE_HIGH = 'burn_rate_high',
  PROJECTED_OVERRUN = 'projected_overrun'
}

export enum TimeTrackingMode {
  MANUAL = 'manual',
  TIMER = 'timer',
  AUTOMATIC = 'automatic',
  HYBRID = 'hybrid'
}

// Core Models

export interface TimeEntry {
  id: string;
  user_id: string;
  task_id?: string;
  project_id?: string;
  description: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  billable: boolean;
  status: TimeEntryStatus;
  tags: string[];
  rate_per_hour?: number;
  total_cost?: number;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  location?: string;
  activity_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Timer {
  id: string;
  user_id: string;
  task_id?: string;
  project_id?: string;
  description: string;
  start_time: string;
  pause_time?: string;
  total_pause_duration: number;
  state: TimerState;
  tags: string[];
  created_at: string;
  elapsed_minutes?: number;
}

export interface TaskEstimate {
  id: string;
  task_id: string;
  estimated_value: number;
  estimate_unit: EstimateUnit;
  confidence_level?: number;
  estimated_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskProgress {
  id: string;
  task_id: string;
  metric_type: ProgressMetricType;
  current_value: number;
  target_value: number;
  unit?: string;
  percentage_complete: number;
  updated_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkPattern {
  id: string;
  user_id: string;
  pattern_type: WorkPatternType;
  timezone: string;
  working_days: number[];
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  holidays: string[];
  exceptions: any[];
  created_at: string;
  updated_at: string;
}

export interface SprintBurndown {
  id: string;
  sprint_id: string;
  project_id: string;
  burndown_type: BurndownType;
  start_date: string;
  end_date: string;
  total_points: number;
  data_points: BurndownDataPoint[];
  ideal_line: IdealLinePoint[];
  created_at: string;
  updated_at: string;
}

export interface BurndownDataPoint {
  date: string;
  remaining: number;
  completed: number;
  timestamp: string;
}

export interface IdealLinePoint {
  date: string;
  remaining: number;
}

export interface TeamVelocity {
  id: string;
  team_id: string;
  project_id?: string;
  period: VelocityPeriod;
  period_start: string;
  period_end: string;
  planned_points: number;
  completed_points: number;
  velocity: number;
  team_size: number;
  available_hours: number;
  created_at: string;
}

export interface TimeTrackingAlert {
  id: string;
  alert_type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  team_id?: string;
  project_id?: string;
  task_id?: string;
  title: string;
  message: string;
  threshold_value?: number;
  actual_value?: number;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface TimeSheet {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  overtime_hours: number;
  status: TimeEntryStatus;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  comments?: string;
  entries: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectTimebudget {
  id: string;
  project_id: string;
  total_hours_budget: number;
  billable_hours_budget: number;
  hours_used: number;
  billable_hours_used: number;
  budget_alert_threshold: number;
  cost_budget?: number;
  cost_used?: number;
  period_start?: string;
  period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface CapacityPlan {
  id: string;
  team_id: string;
  period_start: string;
  period_end: string;
  total_capacity_hours: number;
  allocated_hours: number;
  leave_hours: number;
  available_hours: number;
  team_members: TeamMemberCapacity[];
  created_at: string;
  updated_at: string;
}

export interface TeamMemberCapacity {
  user_id: string;
  capacity_hours: number;
  allocated_hours: number;
}

export interface TimeTrackingReport {
  id: string;
  report_type: ReportType;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  generated_by: string;
  data: Record<string, any>;
  format: string;
  file_path?: string;
  created_at: string;
}

export interface TimeTrackingSettings {
  id: string;
  entity_type: string;
  entity_id: string;
  tracking_mode: TimeTrackingMode;
  allow_overlapping_entries: boolean;
  require_task_association: boolean;
  require_description: boolean;
  minimum_entry_duration: number;
  maximum_entry_duration: number;
  rounding_interval: number;
  allow_future_entries: boolean;
  allow_backdated_entries: boolean;
  max_backdate_days: number;
  auto_start_timer: boolean;
  auto_stop_timer: boolean;
  reminder_enabled: boolean;
  reminder_interval: number;
  approval_required: boolean;
  approvers: string[];
  created_at: string;
  updated_at: string;
}

// Request/Response Models

export interface CreateTimeEntryRequest {
  task_id?: string;
  project_id?: string;
  description: string;
  start_time: string;
  end_time?: string;
  billable: boolean;
  tags: string[];
  rate_per_hour?: number;
  notes?: string;
  location?: string;
  activity_type?: string;
}

export interface StartTimerRequest {
  task_id?: string;
  project_id?: string;
  description: string;
  tags: string[];
}

export interface UpdateProgressRequest {
  task_id: string;
  metric_type: ProgressMetricType;
  current_value: number;
  target_value?: number;
  notes?: string;
}

export interface GenerateReportRequest {
  report_type: ReportType;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  format: string;
}

export interface TimeEntryFilter {
  user_ids?: string[];
  task_ids?: string[];
  project_ids?: string[];
  start_date?: string;
  end_date?: string;
  status?: TimeEntryStatus[];
  billable?: boolean;
  tags?: string[];
  min_duration?: number;
  max_duration?: number;
}

export interface TimeTrackingAnalytics {
  period_start: string;
  period_end: string;
  total_tracked_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  average_daily_hours: number;
  most_tracked_project?: {
    project_id: string;
    hours: number;
  };
  most_tracked_task?: {
    task_id: string;
    hours: number;
  };
  productivity_score?: number;
  time_distribution: Record<string, number>;
  trend_data: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  hours: number;
  entries: number;
}

export interface TaskTimeSummary {
  task_id: string;
  actual_minutes: number;
  estimated_minutes: number;
  variance_minutes: number;
  variance_percentage: number;
  total_entries: number;
  total_contributors: number;
  first_tracked?: string;
  last_tracked?: string;
  progress: number;
  entries: TimeEntry[];
}

export interface UserAvailability {
  user_id: string;
  period_start: string;
  period_end: string;
  total_days: number;
  working_days: number;
  available_hours: number;
  allocated_hours: number;
  utilization_percentage: number;
}

export interface VelocityTrend {
  team_id: string;
  average_velocity: number;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  data_points: VelocityDataPoint[];
}

export interface VelocityDataPoint {
  period: string;
  velocity: number;
  completed_points: number;
}

export interface ProjectBudgetStatus {
  project_id: string;
  has_budget: boolean;
  budget_usage: number;
  hours_remaining: number;
  cost_remaining?: number;
  alert_status: 'no_budget' | 'healthy' | 'warning' | 'exceeded';
  budget?: ProjectTimebudget;
}

// Integration Models

export interface GitHubIntegration {
  id: string;
  user_id: string;
  github_username: string;
  auto_track_commits: boolean;
  auto_track_prs: boolean;
  auto_track_issues: boolean;
  default_project_id?: string;
  webhook_secret?: string;
  created_at: string;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  calendar_type: string;
  calendar_id: string;
  sync_enabled: boolean;
  auto_create_entries: boolean;
  meeting_tracking: boolean;
  created_at: string;
}

// Utility Types

export interface TimeEntrySummary {
  total_entries: number;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_cost: number;
  average_entry_duration: number;
}

export interface ProductivityStats {
  total_days: number;
  days_worked: number;
  average_hours_per_day: number;
  total_hours: number;
  billable_percentage: number;
  most_productive_day?: string;
  task_distribution: Record<string, number>;
}

export interface TeamCapacityUtilization {
  capacity_hours: number;
  allocated_hours: number;
  utilization_percentage: number;
  available_hours: number;
}