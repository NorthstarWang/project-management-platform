"""
Time & Progress Tracking System Models

This module defines comprehensive models for time tracking, progress monitoring,
and advanced analytics in the project management platform.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, time
from enum import Enum
from pydantic import BaseModel, Field, root_validator
import uuid


class TimeEntryStatus(str, Enum):
    """Status of a time entry"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    BILLED = "billed"


class TimerState(str, Enum):
    """State of a timer"""
    STOPPED = "stopped"
    RUNNING = "running"
    PAUSED = "paused"


class WorkPatternType(str, Enum):
    """Type of work pattern"""
    STANDARD = "standard"  # 9-5 Mon-Fri
    FLEXIBLE = "flexible"  # Flexible hours
    SHIFT = "shift"  # Shift work
    CUSTOM = "custom"  # Custom pattern


class ProgressMetricType(str, Enum):
    """Type of progress metric"""
    PERCENTAGE = "percentage"
    COUNT = "count"
    STORY_POINTS = "story_points"
    TIME_BASED = "time_based"
    MILESTONE = "milestone"
    CUSTOM = "custom"


class EstimateUnit(str, Enum):
    """Unit for time estimates"""
    MINUTES = "minutes"
    HOURS = "hours"
    DAYS = "days"
    WEEKS = "weeks"
    STORY_POINTS = "story_points"


class BurndownType(str, Enum):
    """Type of burndown chart"""
    SPRINT = "sprint"
    RELEASE = "release"
    PROJECT = "project"
    EPIC = "epic"


class VelocityPeriod(str, Enum):
    """Period for velocity calculation"""
    SPRINT = "sprint"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"


class AlertType(str, Enum):
    """Type of time tracking alert"""
    OVERTIME = "overtime"
    UNDERTIME = "undertime"
    DEADLINE_APPROACHING = "deadline_approaching"
    DEADLINE_MISSED = "deadline_missed"
    BUDGET_EXCEEDED = "budget_exceeded"
    VELOCITY_DROP = "velocity_drop"
    BURNDOWN_OFF_TRACK = "burndown_off_track"


class ReportType(str, Enum):
    """Type of time tracking report"""
    TIMESHEET = "timesheet"
    UTILIZATION = "utilization"
    BURNDOWN = "burndown"
    VELOCITY = "velocity"
    FORECAST = "forecast"
    BUDGET = "budget"
    TEAM_CAPACITY = "team_capacity"


class TimeTrackingMode(str, Enum):
    """Mode of time tracking"""
    MANUAL = "manual"
    TIMER = "timer"
    AUTOMATIC = "automatic"
    HYBRID = "hybrid"


# Base Models

class TimeEntry(BaseModel):
    """Model for a time entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    billable: bool = False
    status: TimeEntryStatus = TimeEntryStatus.DRAFT
    tags: List[str] = Field(default_factory=list)
    rate_per_hour: Optional[float] = None
    total_cost: Optional[float] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    activity_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @root_validator
    def calculate_duration_and_cost(cls, values):
        start_time = values.get('start_time')
        end_time = values.get('end_time')
        
        if start_time and end_time:
            duration = (end_time - start_time).total_seconds() / 60
            values['duration_minutes'] = int(duration)
            
            if values.get('rate_per_hour') and values.get('billable'):
                values['total_cost'] = (duration / 60) * values['rate_per_hour']
        
        return values


class Timer(BaseModel):
    """Model for an active timer"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str = ""
    start_time: datetime
    pause_time: Optional[datetime] = None
    total_pause_duration: int = 0  # minutes
    state: TimerState = TimerState.RUNNING
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    def get_elapsed_minutes(self) -> int:
        """Calculate elapsed time in minutes"""
        if self.state == TimerState.STOPPED:
            return 0
        
        now = datetime.utcnow()
        if self.state == TimerState.PAUSED and self.pause_time:
            elapsed = (self.pause_time - self.start_time).total_seconds() / 60
        else:
            elapsed = (now - self.start_time).total_seconds() / 60
        
        return int(elapsed - self.total_pause_duration)


class TaskEstimate(BaseModel):
    """Model for task time estimates"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    estimated_value: float
    estimate_unit: EstimateUnit
    confidence_level: Optional[int] = Field(None, ge=0, le=100)
    estimated_by: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskProgress(BaseModel):
    """Model for task progress tracking"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    metric_type: ProgressMetricType
    current_value: float
    target_value: float
    unit: Optional[str] = None
    percentage_complete: float = 0.0
    updated_by: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @root_validator
    def calculate_percentage(cls, values):
        current = values.get('current_value', 0)
        target = values.get('target_value', 1)
        if target > 0:
            values['percentage_complete'] = min((current / target) * 100, 100)
        return values


class WorkPattern(BaseModel):
    """Model for user work patterns"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    pattern_type: WorkPatternType
    timezone: str = "UTC"
    working_days: List[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5])  # Mon-Fri
    start_time: time = Field(default_factory=lambda: time(9, 0))
    end_time: time = Field(default_factory=lambda: time(17, 0))
    break_duration_minutes: int = 60
    holidays: List[date] = Field(default_factory=list)
    exceptions: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def get_daily_capacity_hours(self) -> float:
        """Calculate daily work capacity in hours"""
        start_minutes = self.start_time.hour * 60 + self.start_time.minute
        end_minutes = self.end_time.hour * 60 + self.end_time.minute
        work_minutes = end_minutes - start_minutes - self.break_duration_minutes
        return work_minutes / 60


class SprintBurndown(BaseModel):
    """Model for sprint burndown data"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sprint_id: str
    project_id: str
    burndown_type: BurndownType
    start_date: date
    end_date: date
    total_points: float
    data_points: List[Dict[str, Any]] = Field(default_factory=list)
    ideal_line: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def add_data_point(self, date: date, remaining_points: float, completed_points: float):
        """Add a data point to the burndown"""
        self.data_points.append({
            "date": date.isoformat(),
            "remaining": remaining_points,
            "completed": completed_points,
            "timestamp": datetime.utcnow().isoformat()
        })


class TeamVelocity(BaseModel):
    """Model for team velocity tracking"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    project_id: Optional[str] = None
    period: VelocityPeriod
    period_start: date
    period_end: date
    planned_points: float
    completed_points: float
    velocity: float = 0.0
    team_size: int
    available_hours: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @root_validator
    def calculate_velocity(cls, values):
        completed = values.get('completed_points', 0)
        team_size = values.get('team_size', 1)
        if team_size > 0:
            values['velocity'] = completed / team_size
        return values


class TimeTrackingAlert(BaseModel):
    """Model for time tracking alerts"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_type: AlertType
    severity: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    title: str
    message: str
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TimeSheet(BaseModel):
    """Model for timesheet"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    period_start: date
    period_end: date
    total_hours: float = 0.0
    billable_hours: float = 0.0
    non_billable_hours: float = 0.0
    overtime_hours: float = 0.0
    status: TimeEntryStatus = TimeEntryStatus.DRAFT
    submitted_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    comments: Optional[str] = None
    entries: List[str] = Field(default_factory=list)  # TimeEntry IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectTimebudget(BaseModel):
    """Model for project time budget"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    total_hours_budget: float
    billable_hours_budget: float
    hours_used: float = 0.0
    billable_hours_used: float = 0.0
    budget_alert_threshold: float = 80.0  # percentage
    cost_budget: Optional[float] = None
    cost_used: Optional[float] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def get_budget_usage_percentage(self) -> float:
        """Calculate budget usage percentage"""
        if self.total_hours_budget > 0:
            return (self.hours_used / self.total_hours_budget) * 100
        return 0.0


class CapacityPlan(BaseModel):
    """Model for team capacity planning"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    period_start: date
    period_end: date
    total_capacity_hours: float
    allocated_hours: float = 0.0
    leave_hours: float = 0.0
    available_hours: float = 0.0
    team_members: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @root_validator
    def calculate_available_hours(cls, values):
        total = values.get('total_capacity_hours', 0)
        allocated = values.get('allocated_hours', 0)
        leave = values.get('leave_hours', 0)
        values['available_hours'] = max(0, total - allocated - leave)
        return values


class TimeTrackingReport(BaseModel):
    """Model for time tracking reports"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: ReportType
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    generated_by: str
    data: Dict[str, Any] = Field(default_factory=dict)
    format: str = "json"  # json, csv, pdf
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TimeTrackingSettings(BaseModel):
    """Model for time tracking settings"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str  # user, team, project, organization
    entity_id: str
    tracking_mode: TimeTrackingMode = TimeTrackingMode.MANUAL
    allow_overlapping_entries: bool = False
    require_task_association: bool = True
    require_description: bool = True
    minimum_entry_duration: int = 1  # minutes
    maximum_entry_duration: int = 1440  # minutes (24 hours)
    rounding_interval: int = 0  # minutes (0 = no rounding)
    allow_future_entries: bool = False
    allow_backdated_entries: bool = True
    max_backdate_days: int = 30
    auto_start_timer: bool = False
    auto_stop_timer: bool = False
    reminder_enabled: bool = True
    reminder_interval: int = 60  # minutes
    approval_required: bool = False
    approvers: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Integration Models

class GitHubIntegration(BaseModel):
    """Model for GitHub time tracking integration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    github_username: str
    auto_track_commits: bool = True
    auto_track_prs: bool = True
    auto_track_issues: bool = True
    default_project_id: Optional[str] = None
    webhook_secret: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CalendarIntegration(BaseModel):
    """Model for calendar integration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    calendar_type: str  # google, outlook, ical
    calendar_id: str
    sync_enabled: bool = True
    auto_create_entries: bool = False
    meeting_tracking: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Request/Response Models

class CreateTimeEntryRequest(BaseModel):
    """Request model for creating a time entry"""
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str
    start_time: datetime
    end_time: Optional[datetime] = None
    billable: bool = False
    tags: List[str] = Field(default_factory=list)
    rate_per_hour: Optional[float] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    activity_type: Optional[str] = None


class StartTimerRequest(BaseModel):
    """Request model for starting a timer"""
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    description: str = ""
    tags: List[str] = Field(default_factory=list)


class UpdateProgressRequest(BaseModel):
    """Request model for updating task progress"""
    task_id: str
    metric_type: ProgressMetricType
    current_value: float
    target_value: Optional[float] = None
    notes: Optional[str] = None


class GenerateReportRequest(BaseModel):
    """Request model for generating reports"""
    report_type: ReportType
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    format: str = "json"


class TimeEntryFilter(BaseModel):
    """Filter model for time entries"""
    user_ids: Optional[List[str]] = None
    task_ids: Optional[List[str]] = None
    project_ids: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[List[TimeEntryStatus]] = None
    billable: Optional[bool] = None
    tags: Optional[List[str]] = None
    min_duration: Optional[int] = None
    max_duration: Optional[int] = None


class TimeTrackingAnalytics(BaseModel):
    """Model for time tracking analytics"""
    period_start: date
    period_end: date
    total_tracked_hours: float
    billable_hours: float
    non_billable_hours: float
    average_daily_hours: float
    most_tracked_project: Optional[Dict[str, Any]] = None
    most_tracked_task: Optional[Dict[str, Any]] = None
    productivity_score: Optional[float] = None
    time_distribution: Dict[str, float] = Field(default_factory=dict)
    trend_data: List[Dict[str, Any]] = Field(default_factory=list)