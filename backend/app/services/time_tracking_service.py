"""
Time & Progress Tracking Service

This module provides business logic for time tracking, progress monitoring,
and analytics in the project management platform.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
import statistics
from collections import defaultdict

from ..models.time_tracking_models import (
    TimeEntry, Timer, TaskEstimate, TaskProgress, WorkPattern,
    SprintBurndown, TeamVelocity, TimeTrackingAlert, TimeSheet,
    ProjectTimebudget, CapacityPlan, TimeTrackingReport,
    TimeTrackingSettings, GitHubIntegration, CalendarIntegration,
    TimeEntryStatus, TimerState, AlertType, TimeEntryFilter,
    CreateTimeEntryRequest, StartTimerRequest, UpdateProgressRequest,
    GenerateReportRequest, ProgressMetricType, ReportType,
    BurndownType, VelocityPeriod, TimeTrackingAnalytics
)
from ..repositories.time_tracking_repository import TimeTrackingRepository
from ..repositories.user_repository import UserRepository
from ..repositories.task_repository import TaskRepository
from ..repositories.project_repository import ProjectRepository


class TimeTrackingService:
    """Service for time tracking operations"""
    
    def __init__(self, 
                 time_tracking_repo: Optional[TimeTrackingRepository] = None,
                 user_repo: Optional[UserRepository] = None,
                 task_repo: Optional[TaskRepository] = None,
                 project_repo: Optional[ProjectRepository] = None):
        self.repo = time_tracking_repo or TimeTrackingRepository()
        self.user_repo = user_repo
        self.task_repo = task_repo
        self.project_repo = project_repo
    
    # Time Entry Management
    
    def create_time_entry(self, user_id: str, request: CreateTimeEntryRequest) -> TimeEntry:
        """Create a new time entry"""
        # Stop any active timers for the user
        self.repo.stop_all_user_timers(user_id)
        
        # Validate task/project exists
        if request.task_id and self.task_repo:
            task = self.task_repo.get_task(request.task_id)
            if not task:
                raise ValueError(f"Task {request.task_id} not found")
        
        if request.project_id and self.project_repo:
            project = self.project_repo.get_project(request.project_id)
            if not project:
                raise ValueError(f"Project {request.project_id} not found")
        
        # Get user settings
        settings = self._get_applicable_settings("user", user_id)
        
        # Validate entry based on settings
        if settings:
            # Check if task association is required
            if settings.require_task_association and not request.task_id:
                raise ValueError("Task association is required for time entries")
            
            # Check if description is required
            if settings.require_description and not request.description:
                raise ValueError("Description is required for time entries")
            
            # Check for future entries
            if not settings.allow_future_entries and request.start_time > datetime.utcnow():
                raise ValueError("Future time entries are not allowed")
            
            # Check for backdated entries
            if not settings.allow_backdated_entries and request.start_time.date() < date.today():
                raise ValueError("Backdated time entries are not allowed")
            elif settings.allow_backdated_entries and settings.max_backdate_days > 0:
                max_backdate = date.today() - timedelta(days=settings.max_backdate_days)
                if request.start_time.date() < max_backdate:
                    raise ValueError(f"Time entries cannot be backdated more than {settings.max_backdate_days} days")
        
        # Create entry
        entry = TimeEntry(
            user_id=user_id,
            task_id=request.task_id,
            project_id=request.project_id,
            description=request.description,
            start_time=request.start_time,
            end_time=request.end_time,
            billable=request.billable,
            tags=request.tags,
            rate_per_hour=request.rate_per_hour,
            notes=request.notes,
            location=request.location,
            activity_type=request.activity_type
        )
        
        # Apply rounding if configured
        if settings and settings.rounding_interval > 0:
            entry = self._apply_time_rounding(entry, settings.rounding_interval)
        
        # Check for overlapping entries
        if settings and not settings.allow_overlapping_entries:
            overlapping = self._check_overlapping_entries(user_id, entry)
            if overlapping:
                raise ValueError("Overlapping time entries are not allowed")
        
        # Save entry
        created_entry = self.repo.create_time_entry(entry)
        
        # Update project budget if applicable
        if entry.project_id:
            self._update_project_budget(entry.project_id, entry)
        
        # Check for alerts
        self._check_time_entry_alerts(user_id, created_entry)
        
        return created_entry
    
    def update_time_entry(self, user_id: str, entry_id: str, updates: Dict[str, Any]) -> TimeEntry:
        """Update a time entry"""
        entry = self.repo.get_time_entry(entry_id)
        if not entry:
            raise ValueError(f"Time entry {entry_id} not found")
        
        # Check permissions
        if entry.user_id != user_id and not self._is_manager_or_admin(user_id):
            raise PermissionError("You can only update your own time entries")
        
        # Validate updates
        settings = self._get_applicable_settings("user", entry.user_id)
        if settings:
            if 'start_time' in updates and not settings.allow_future_entries:
                if updates['start_time'] > datetime.utcnow():
                    raise ValueError("Future time entries are not allowed")
        
        # Apply updates
        updated_entry = self.repo.update_time_entry(entry_id, updates)
        
        # Update project budget if duration changed
        if 'duration_minutes' in updates or 'billable' in updates:
            if entry.project_id:
                self._update_project_budget(entry.project_id, updated_entry, entry)
        
        return updated_entry
    
    def delete_time_entry(self, user_id: str, entry_id: str) -> bool:
        """Delete a time entry"""
        entry = self.repo.get_time_entry(entry_id)
        if not entry:
            raise ValueError(f"Time entry {entry_id} not found")
        
        # Check permissions
        if entry.user_id != user_id and not self._is_manager_or_admin(user_id):
            raise PermissionError("You can only delete your own time entries")
        
        # Check if entry is approved
        if entry.status == TimeEntryStatus.APPROVED:
            raise ValueError("Cannot delete approved time entries")
        
        # Update project budget
        if entry.project_id:
            self._update_project_budget(entry.project_id, None, entry)
        
        return self.repo.delete_time_entry(entry_id)
    
    def get_time_entries(self, user_id: str, filter_params: TimeEntryFilter) -> List[TimeEntry]:
        """Get time entries with filtering"""
        # Check permissions - users can only see their own entries unless admin/manager
        if not self._is_manager_or_admin(user_id):
            filter_params.user_ids = [user_id]
        
        return self.repo.filter_time_entries(filter_params)
    
    def approve_time_entry(self, approver_id: str, entry_id: str) -> TimeEntry:
        """Approve a time entry"""
        if not self._is_manager_or_admin(approver_id):
            raise PermissionError("Only managers and admins can approve time entries")
        
        entry = self.repo.get_time_entry(entry_id)
        if not entry:
            raise ValueError(f"Time entry {entry_id} not found")
        
        if entry.status == TimeEntryStatus.APPROVED:
            raise ValueError("Time entry is already approved")
        
        updates = {
            "status": TimeEntryStatus.APPROVED,
            "approved_by": approver_id,
            "approved_at": datetime.utcnow()
        }
        
        return self.repo.update_time_entry(entry_id, updates)
    
    def reject_time_entry(self, approver_id: str, entry_id: str, reason: str) -> TimeEntry:
        """Reject a time entry"""
        if not self._is_manager_or_admin(approver_id):
            raise PermissionError("Only managers and admins can reject time entries")
        
        entry = self.repo.get_time_entry(entry_id)
        if not entry:
            raise ValueError(f"Time entry {entry_id} not found")
        
        updates = {
            "status": TimeEntryStatus.REJECTED,
            "notes": f"Rejected: {reason}"
        }
        
        return self.repo.update_time_entry(entry_id, updates)
    
    # Timer Management
    
    def start_timer(self, user_id: str, request: StartTimerRequest) -> Timer:
        """Start a new timer"""
        # Stop any existing timers
        self.repo.stop_all_user_timers(user_id)
        
        # Validate task/project
        if request.task_id and self.task_repo:
            task = self.task_repo.get_task(request.task_id)
            if not task:
                raise ValueError(f"Task {request.task_id} not found")
        
        if request.project_id and self.project_repo:
            project = self.project_repo.get_project(request.project_id)
            if not project:
                raise ValueError(f"Project {request.project_id} not found")
        
        # Create timer
        timer = Timer(
            user_id=user_id,
            task_id=request.task_id,
            project_id=request.project_id,
            description=request.description,
            tags=request.tags,
            start_time=datetime.utcnow(),
            state=TimerState.RUNNING
        )
        
        return self.repo.create_timer(timer)
    
    def stop_timer(self, user_id: str, timer_id: str, description: Optional[str] = None) -> TimeEntry:
        """Stop a timer and create a time entry"""
        timer = self.repo.get_timer(timer_id)
        if not timer:
            raise ValueError(f"Timer {timer_id} not found")
        
        if timer.user_id != user_id:
            raise PermissionError("You can only stop your own timers")
        
        if timer.state != TimerState.RUNNING:
            raise ValueError("Timer is not running")
        
        # Stop timer
        end_time = datetime.utcnow()
        self.repo.update_timer(timer_id, {"state": TimerState.STOPPED})
        
        # Create time entry from timer
        entry_request = CreateTimeEntryRequest(
            task_id=timer.task_id,
            project_id=timer.project_id,
            description=description or timer.description or "Timer entry",
            start_time=timer.start_time,
            end_time=end_time,
            tags=timer.tags
        )
        
        entry = self.create_time_entry(user_id, entry_request)
        
        # Delete timer
        self.repo.delete_timer(timer_id)
        
        return entry
    
    def pause_timer(self, user_id: str, timer_id: str) -> Timer:
        """Pause a running timer"""
        timer = self.repo.get_timer(timer_id)
        if not timer:
            raise ValueError(f"Timer {timer_id} not found")
        
        if timer.user_id != user_id:
            raise PermissionError("You can only pause your own timers")
        
        if timer.state != TimerState.RUNNING:
            raise ValueError("Timer is not running")
        
        updates = {
            "state": TimerState.PAUSED,
            "pause_time": datetime.utcnow()
        }
        
        return self.repo.update_timer(timer_id, updates)
    
    def resume_timer(self, user_id: str, timer_id: str) -> Timer:
        """Resume a paused timer"""
        timer = self.repo.get_timer(timer_id)
        if not timer:
            raise ValueError(f"Timer {timer_id} not found")
        
        if timer.user_id != user_id:
            raise PermissionError("You can only resume your own timers")
        
        if timer.state != TimerState.PAUSED:
            raise ValueError("Timer is not paused")
        
        # Calculate pause duration
        if timer.pause_time:
            pause_duration = (datetime.utcnow() - timer.pause_time).total_seconds() / 60
            total_pause = timer.total_pause_duration + int(pause_duration)
        else:
            total_pause = timer.total_pause_duration
        
        updates = {
            "state": TimerState.RUNNING,
            "pause_time": None,
            "total_pause_duration": total_pause
        }
        
        return self.repo.update_timer(timer_id, updates)
    
    def get_active_timer(self, user_id: str) -> Optional[Timer]:
        """Get user's active timer"""
        return self.repo.get_user_active_timer(user_id)
    
    # Task Estimation & Progress
    
    def create_task_estimate(self, user_id: str, task_id: str, estimate: TaskEstimate) -> TaskEstimate:
        """Create a task estimate"""
        # Validate task exists
        if self.task_repo:
            task = self.task_repo.get_task(task_id)
            if not task:
                raise ValueError(f"Task {task_id} not found")
        
        estimate.task_id = task_id
        estimate.estimated_by = user_id
        
        return self.repo.create_task_estimate(estimate)
    
    def update_task_progress(self, user_id: str, request: UpdateProgressRequest) -> TaskProgress:
        """Update task progress"""
        # Validate task exists
        if self.task_repo:
            task = self.task_repo.get_task(request.task_id)
            if not task:
                raise ValueError(f"Task {request.task_id} not found")
        
        # Get or calculate target value
        target_value = request.target_value
        if not target_value:
            # Try to get from latest estimate
            estimate = self.repo.get_latest_task_estimate(request.task_id)
            if estimate and request.metric_type == ProgressMetricType.TIME_BASED:
                target_value = estimate.estimated_value
            else:
                target_value = 100  # Default for percentage-based
        
        progress = TaskProgress(
            task_id=request.task_id,
            metric_type=request.metric_type,
            current_value=request.current_value,
            target_value=target_value,
            updated_by=user_id,
            notes=request.notes
        )
        
        created_progress = self.repo.create_task_progress(progress)
        
        # Check if task is complete
        if created_progress.percentage_complete >= 100:
            self._check_task_completion_alerts(request.task_id)
        
        return created_progress
    
    def get_task_time_summary(self, task_id: str) -> Dict[str, Any]:
        """Get comprehensive time summary for a task"""
        # Get actual vs estimated
        comparison = self.repo.get_task_actual_vs_estimated(task_id)
        
        # Get time entries
        entries = self.repo.get_task_time_entries(task_id)
        
        # Get latest progress
        progress = self.repo.get_latest_task_progress(task_id)
        
        # Calculate summary
        total_contributors = len(set(e.user_id for e in entries))
        first_entry = min(entries, key=lambda x: x.start_time) if entries else None
        last_entry = max(entries, key=lambda x: x.start_time) if entries else None
        
        return {
            "task_id": task_id,
            "actual_minutes": comparison["actual_minutes"],
            "estimated_minutes": comparison["estimated_minutes"],
            "variance_minutes": comparison["variance_minutes"],
            "variance_percentage": comparison["variance_percentage"],
            "total_entries": len(entries),
            "total_contributors": total_contributors,
            "first_tracked": first_entry.start_time if first_entry else None,
            "last_tracked": last_entry.start_time if last_entry else None,
            "progress": progress.percentage_complete if progress else 0,
            "entries": entries[:10]  # Last 10 entries
        }
    
    # Work Patterns & Capacity
    
    def create_work_pattern(self, user_id: str, pattern: WorkPattern) -> WorkPattern:
        """Create or update work pattern for a user"""
        pattern.user_id = user_id
        
        # Check if pattern already exists
        existing = self.repo.get_user_work_pattern(user_id)
        if existing:
            # Update existing pattern
            updates = pattern.dict(exclude={'id', 'created_at'})
            return self.repo.update_work_pattern(existing.id, updates)
        
        return self.repo.create_work_pattern(pattern)
    
    def get_user_availability(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calculate user availability for a date range"""
        pattern = self.repo.get_user_work_pattern(user_id)
        if not pattern:
            # Default pattern
            pattern = WorkPattern(user_id=user_id)
        
        total_days = (end_date - start_date).days + 1
        working_days = 0
        available_hours = 0.0
        
        current_date = start_date
        while current_date <= end_date:
            # Check if it's a working day
            if current_date.weekday() in pattern.working_days:
                # Check if it's not a holiday
                if current_date not in pattern.holidays:
                    working_days += 1
                    available_hours += pattern.get_daily_capacity_hours()
            
            current_date += timedelta(days=1)
        
        # Get allocated hours
        entries = self.repo.get_user_time_entries(user_id, start_date, end_date)
        allocated_hours = sum(e.duration_minutes or 0 for e in entries) / 60
        
        return {
            "user_id": user_id,
            "period_start": start_date,
            "period_end": end_date,
            "total_days": total_days,
            "working_days": working_days,
            "available_hours": available_hours,
            "allocated_hours": allocated_hours,
            "utilization_percentage": (allocated_hours / available_hours * 100) if available_hours > 0 else 0
        }
    
    def create_capacity_plan(self, team_id: str, start_date: date, end_date: date,
                           team_member_ids: List[str]) -> CapacityPlan:
        """Create capacity plan for a team"""
        # Calculate total capacity
        total_capacity = 0.0
        team_members = []
        
        for member_id in team_member_ids:
            availability = self.get_user_availability(member_id, start_date, end_date)
            member_capacity = availability["available_hours"]
            total_capacity += member_capacity
            
            team_members.append({
                "user_id": member_id,
                "capacity_hours": member_capacity,
                "allocated_hours": availability["allocated_hours"]
            })
        
        # Create plan
        plan = CapacityPlan(
            team_id=team_id,
            period_start=start_date,
            period_end=end_date,
            total_capacity_hours=total_capacity,
            allocated_hours=sum(m["allocated_hours"] for m in team_members),
            team_members=team_members
        )
        
        return self.repo.create_capacity_plan(plan)
    
    # Sprint & Velocity Tracking
    
    def create_sprint_burndown(self, sprint_id: str, project_id: str,
                             start_date: date, end_date: date,
                             total_points: float) -> SprintBurndown:
        """Create a sprint burndown chart"""
        burndown = SprintBurndown(
            sprint_id=sprint_id,
            project_id=project_id,
            burndown_type=BurndownType.SPRINT,
            start_date=start_date,
            end_date=end_date,
            total_points=total_points
        )
        
        # Generate ideal line
        days = (end_date - start_date).days + 1
        daily_burn = total_points / days
        
        for i in range(days + 1):
            current_date = start_date + timedelta(days=i)
            remaining = max(0, total_points - (daily_burn * i))
            burndown.ideal_line.append({
                "date": current_date.isoformat(),
                "remaining": remaining
            })
        
        return self.repo.create_sprint_burndown(burndown)
    
    def update_burndown_progress(self, burndown_id: str, completed_points: float) -> SprintBurndown:
        """Update burndown with current progress"""
        burndown = self.repo.get_sprint_burndown(burndown_id)
        if not burndown:
            raise ValueError(f"Burndown {burndown_id} not found")
        
        # Calculate remaining points
        total_completed = sum(dp.get("completed", 0) for dp in burndown.data_points)
        total_completed += completed_points
        remaining = max(0, burndown.total_points - total_completed)
        
        # Add data point
        burndown.add_data_point(date.today(), remaining, completed_points)
        burndown.updated_at = datetime.utcnow()
        
        # Check if burndown is off track
        self._check_burndown_alerts(burndown)
        
        return burndown
    
    def calculate_team_velocity(self, team_id: str, period: VelocityPeriod,
                              period_start: date, period_end: date) -> TeamVelocity:
        """Calculate and store team velocity"""
        # This would integrate with sprint/task completion data
        # For now, we'll create a placeholder
        velocity = TeamVelocity(
            team_id=team_id,
            period=period,
            period_start=period_start,
            period_end=period_end,
            planned_points=0,  # Would come from sprint planning
            completed_points=0,  # Would come from completed tasks
            team_size=5,  # Would come from team data
            available_hours=0  # Would come from capacity plan
        )
        
        return self.repo.create_team_velocity(velocity)
    
    def get_velocity_trend(self, team_id: str, periods: int = 6) -> Dict[str, Any]:
        """Get velocity trend for a team"""
        velocities = self.repo.get_team_velocities(team_id)[:periods]
        
        if not velocities:
            return {
                "team_id": team_id,
                "average_velocity": 0,
                "trend": "stable",
                "data_points": []
            }
        
        # Calculate trend
        velocity_values = [v.velocity for v in velocities]
        average_velocity = statistics.mean(velocity_values)
        
        # Simple trend detection
        if len(velocity_values) >= 3:
            recent_avg = statistics.mean(velocity_values[:3])
            older_avg = statistics.mean(velocity_values[3:])
            
            if recent_avg > older_avg * 1.1:
                trend = "improving"
            elif recent_avg < older_avg * 0.9:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "team_id": team_id,
            "average_velocity": average_velocity,
            "trend": trend,
            "data_points": [
                {
                    "period": v.period_start.isoformat(),
                    "velocity": v.velocity,
                    "completed_points": v.completed_points
                }
                for v in velocities
            ]
        }
    
    # Timesheet Management
    
    def create_timesheet(self, user_id: str, period_start: date, period_end: date) -> TimeSheet:
        """Create a timesheet for a period"""
        # Check if timesheet already exists
        existing = self.repo.get_timesheet_by_period(user_id, period_start, period_end)
        if existing:
            return existing
        
        # Get entries for the period
        entries = self.repo.get_user_time_entries(user_id, period_start, period_end)
        entry_ids = [e.id for e in entries]
        
        # Calculate totals
        hours_data = self.repo.calculate_user_hours(user_id, period_start, period_end)
        
        # Get work pattern for overtime calculation
        pattern = self.repo.get_user_work_pattern(user_id)
        if pattern:
            availability = self.get_user_availability(user_id, period_start, period_end)
            expected_hours = availability["available_hours"]
            overtime = max(0, hours_data["total"] - expected_hours)
        else:
            overtime = 0
        
        timesheet = TimeSheet(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
            total_hours=hours_data["total"],
            billable_hours=hours_data["billable"],
            non_billable_hours=hours_data["non_billable"],
            overtime_hours=overtime,
            entries=entry_ids
        )
        
        return self.repo.create_timesheet(timesheet)
    
    def submit_timesheet(self, user_id: str, timesheet_id: str) -> TimeSheet:
        """Submit a timesheet for approval"""
        timesheet = self.repo.get_timesheet(timesheet_id)
        if not timesheet:
            raise ValueError(f"Timesheet {timesheet_id} not found")
        
        if timesheet.user_id != user_id:
            raise PermissionError("You can only submit your own timesheets")
        
        if timesheet.status != TimeEntryStatus.DRAFT:
            raise ValueError("Timesheet is not in draft status")
        
        updates = {
            "status": TimeEntryStatus.SUBMITTED,
            "submitted_at": datetime.utcnow()
        }
        
        return self.repo.update_timesheet(timesheet_id, updates)
    
    def approve_timesheet(self, approver_id: str, timesheet_id: str) -> TimeSheet:
        """Approve a timesheet"""
        if not self._is_manager_or_admin(approver_id):
            raise PermissionError("Only managers and admins can approve timesheets")
        
        timesheet = self.repo.get_timesheet(timesheet_id)
        if not timesheet:
            raise ValueError(f"Timesheet {timesheet_id} not found")
        
        if timesheet.status != TimeEntryStatus.SUBMITTED:
            raise ValueError("Timesheet is not submitted for approval")
        
        updates = {
            "status": TimeEntryStatus.APPROVED,
            "approved_by": approver_id,
            "approved_at": datetime.utcnow()
        }
        
        # Update timesheet
        updated_timesheet = self.repo.update_timesheet(timesheet_id, updates)
        
        # Approve all entries in the timesheet
        for entry_id in timesheet.entries:
            self.approve_time_entry(approver_id, entry_id)
        
        return updated_timesheet
    
    # Budget Management
    
    def create_project_budget(self, project_id: str, budget: ProjectTimebudget) -> ProjectTimebudget:
        """Create time budget for a project"""
        budget.project_id = project_id
        return self.repo.create_project_timebudget(budget)
    
    def get_project_budget_status(self, project_id: str) -> Dict[str, Any]:
        """Get current budget status for a project"""
        budget = self.repo.get_active_project_budget(project_id)
        if not budget:
            return {
                "project_id": project_id,
                "has_budget": False,
                "budget_usage": 0,
                "hours_remaining": 0,
                "cost_remaining": 0,
                "alert_status": "no_budget"
            }
        
        hours_remaining = budget.total_hours_budget - budget.hours_used
        cost_remaining = (budget.cost_budget - budget.cost_used) if budget.cost_budget else None
        usage_percentage = budget.get_budget_usage_percentage()
        
        # Determine alert status
        if usage_percentage >= 100:
            alert_status = "exceeded"
        elif usage_percentage >= budget.budget_alert_threshold:
            alert_status = "warning"
        else:
            alert_status = "healthy"
        
        return {
            "project_id": project_id,
            "has_budget": True,
            "budget_usage": usage_percentage,
            "hours_remaining": hours_remaining,
            "cost_remaining": cost_remaining,
            "alert_status": alert_status,
            "budget": budget
        }
    
    # Analytics & Reporting
    
    def generate_report(self, user_id: str, request: GenerateReportRequest) -> TimeTrackingReport:
        """Generate a time tracking report"""
        report_data = {}
        
        if request.report_type == ReportType.TIMESHEET:
            # Generate timesheet report
            filter_params = TimeEntryFilter(**request.parameters)
            entries = self.get_time_entries(user_id, filter_params)
            
            report_data = {
                "entries": [e.dict() for e in entries],
                "summary": self._summarize_entries(entries)
            }
        
        elif request.report_type == ReportType.UTILIZATION:
            # Generate utilization report
            team_id = request.parameters.get("team_id")
            start_date = request.parameters.get("start_date")
            end_date = request.parameters.get("end_date")
            
            if team_id:
                report_data = self._generate_team_utilization_report(
                    team_id, start_date, end_date
                )
            else:
                report_data = self._generate_user_utilization_report(
                    user_id, start_date, end_date
                )
        
        elif request.report_type == ReportType.BURNDOWN:
            # Get burndown data
            project_id = request.parameters.get("project_id")
            burndowns = self.repo.get_project_burndowns(project_id)
            
            report_data = {
                "burndowns": [b.dict() for b in burndowns[:5]]
            }
        
        elif request.report_type == ReportType.VELOCITY:
            # Get velocity data
            team_id = request.parameters.get("team_id")
            report_data = self.get_velocity_trend(team_id)
        
        elif request.report_type == ReportType.BUDGET:
            # Get budget status
            project_id = request.parameters.get("project_id")
            report_data = self.get_project_budget_status(project_id)
        
        # Create report record
        report = TimeTrackingReport(
            report_type=request.report_type,
            name=request.name,
            description=request.description,
            parameters=request.parameters,
            generated_by=user_id,
            data=report_data,
            format=request.format
        )
        
        return self.repo.create_report(report)
    
    def get_time_tracking_analytics(self, user_id: str, start_date: date, end_date: date) -> TimeTrackingAnalytics:
        """Get comprehensive time tracking analytics"""
        # Get hours data
        hours_data = self.repo.calculate_user_hours(user_id, start_date, end_date)
        
        # Get productivity stats
        productivity = self.repo.get_user_productivity_stats(user_id, start_date, end_date)
        
        # Get entries for additional analysis
        entries = self.repo.get_user_time_entries(user_id, start_date, end_date)
        
        # Calculate time distribution by project
        project_hours = defaultdict(float)
        task_hours = defaultdict(float)
        
        for entry in entries:
            if entry.duration_minutes:
                hours = entry.duration_minutes / 60
                if entry.project_id:
                    project_hours[entry.project_id] += hours
                if entry.task_id:
                    task_hours[entry.task_id] += hours
        
        # Find most tracked project/task
        most_tracked_project = None
        most_tracked_task = None
        
        if project_hours:
            top_project_id = max(project_hours, key=project_hours.get)
            most_tracked_project = {
                "project_id": top_project_id,
                "hours": project_hours[top_project_id]
            }
        
        if task_hours:
            top_task_id = max(task_hours, key=task_hours.get)
            most_tracked_task = {
                "task_id": top_task_id,
                "hours": task_hours[top_task_id]
            }
        
        # Generate trend data (daily hours for the period)
        trend_data = []
        current_date = start_date
        while current_date <= end_date:
            day_entries = [e for e in entries if e.start_time.date() == current_date]
            day_hours = sum(e.duration_minutes or 0 for e in day_entries) / 60
            
            trend_data.append({
                "date": current_date.isoformat(),
                "hours": day_hours,
                "entries": len(day_entries)
            })
            
            current_date += timedelta(days=1)
        
        return TimeTrackingAnalytics(
            period_start=start_date,
            period_end=end_date,
            total_tracked_hours=hours_data["total"],
            billable_hours=hours_data["billable"],
            non_billable_hours=hours_data["non_billable"],
            average_daily_hours=productivity["average_hours_per_day"],
            most_tracked_project=most_tracked_project,
            most_tracked_task=most_tracked_task,
            productivity_score=self._calculate_productivity_score(productivity),
            time_distribution=dict(project_hours),
            trend_data=trend_data
        )
    
    # Settings Management
    
    def update_time_tracking_settings(self, entity_type: str, entity_id: str,
                                    settings: TimeTrackingSettings) -> TimeTrackingSettings:
        """Update time tracking settings for an entity"""
        settings.entity_type = entity_type
        settings.entity_id = entity_id
        
        # Check if settings exist
        existing = self.repo.get_entity_settings(entity_type, entity_id)
        if existing:
            updates = settings.dict(exclude={'id', 'created_at'})
            return self.repo.update_settings(existing.id, updates)
        
        return self.repo.create_settings(settings)
    
    def get_time_tracking_settings(self, entity_type: str, entity_id: str) -> Optional[TimeTrackingSettings]:
        """Get time tracking settings for an entity"""
        return self.repo.get_entity_settings(entity_type, entity_id)
    
    # Integration Management
    
    def setup_github_integration(self, user_id: str, github_username: str,
                               auto_track_commits: bool = True) -> GitHubIntegration:
        """Setup GitHub integration for a user"""
        # Check if integration exists
        existing = self.repo.get_user_github_integration(user_id)
        if existing:
            raise ValueError("GitHub integration already exists for this user")
        
        integration = GitHubIntegration(
            user_id=user_id,
            github_username=github_username,
            auto_track_commits=auto_track_commits
        )
        
        return self.repo.create_github_integration(integration)
    
    def setup_calendar_integration(self, user_id: str, calendar_type: str,
                                 calendar_id: str) -> CalendarIntegration:
        """Setup calendar integration for a user"""
        integration = CalendarIntegration(
            user_id=user_id,
            calendar_type=calendar_type,
            calendar_id=calendar_id
        )
        
        return self.repo.create_calendar_integration(integration)
    
    # Helper Methods
    
    def _get_applicable_settings(self, entity_type: str, entity_id: str) -> Optional[TimeTrackingSettings]:
        """Get the most applicable settings for an entity"""
        # Try entity-specific settings first
        settings = self.repo.get_entity_settings(entity_type, entity_id)
        if settings:
            return settings
        
        # Fall back to organization settings if available
        # For now, return None
        return None
    
    def _apply_time_rounding(self, entry: TimeEntry, interval: int) -> TimeEntry:
        """Apply time rounding to an entry"""
        if not entry.duration_minutes:
            return entry
        
        # Round to nearest interval
        rounded = round(entry.duration_minutes / interval) * interval
        entry.duration_minutes = max(interval, rounded)  # At least one interval
        
        # Adjust end time to match rounded duration
        if entry.start_time and entry.end_time:
            entry.end_time = entry.start_time + timedelta(minutes=entry.duration_minutes)
        
        return entry
    
    def _check_overlapping_entries(self, user_id: str, entry: TimeEntry) -> bool:
        """Check if entry overlaps with existing entries"""
        if not entry.start_time or not entry.end_time:
            return False
        
        existing_entries = self.repo.get_user_time_entries(user_id)
        
        for existing in existing_entries:
            if existing.id == entry.id:
                continue
            
            if not existing.start_time or not existing.end_time:
                continue
            
            # Check for overlap
            if (entry.start_time < existing.end_time and 
                entry.end_time > existing.start_time):
                return True
        
        return False
    
    def _update_project_budget(self, project_id: str, new_entry: Optional[TimeEntry],
                              old_entry: Optional[TimeEntry] = None):
        """Update project budget based on time entry changes"""
        budget = self.repo.get_active_project_budget(project_id)
        if not budget:
            return
        
        # Calculate difference
        hours_diff = 0.0
        billable_diff = 0.0
        cost_diff = 0.0
        
        if old_entry and old_entry.duration_minutes:
            hours = old_entry.duration_minutes / 60
            hours_diff -= hours
            if old_entry.billable:
                billable_diff -= hours
                if old_entry.total_cost:
                    cost_diff -= old_entry.total_cost
        
        if new_entry and new_entry.duration_minutes:
            hours = new_entry.duration_minutes / 60
            hours_diff += hours
            if new_entry.billable:
                billable_diff += hours
                if new_entry.total_cost:
                    cost_diff += new_entry.total_cost
        
        # Update budget
        updates = {
            "hours_used": budget.hours_used + hours_diff,
            "billable_hours_used": budget.billable_hours_used + billable_diff
        }
        
        if budget.cost_budget is not None:
            updates["cost_used"] = (budget.cost_used or 0) + cost_diff
        
        self.repo.update_project_budget(budget.id, updates)
        
        # Check if budget alerts needed
        updated_budget = self.repo.get_project_timebudget(budget.id)
        if updated_budget:
            usage = updated_budget.get_budget_usage_percentage()
            if usage >= updated_budget.budget_alert_threshold:
                self._create_budget_alert(project_id, updated_budget, usage)
    
    def _check_time_entry_alerts(self, user_id: str, entry: TimeEntry):
        """Check and create alerts based on time entry"""
        # Check for overtime
        pattern = self.repo.get_user_work_pattern(user_id)
        if pattern:
            daily_capacity = pattern.get_daily_capacity_hours()
            
            # Get today's entries
            today_entries = self.repo.get_user_time_entries(
                user_id, 
                entry.start_time.date(), 
                entry.start_time.date()
            )
            
            today_hours = sum(e.duration_minutes or 0 for e in today_entries) / 60
            
            if today_hours > daily_capacity:
                overtime = today_hours - daily_capacity
                alert = TimeTrackingAlert(
                    alert_type=AlertType.OVERTIME,
                    severity="medium",
                    user_id=user_id,
                    title="Overtime Alert",
                    message=f"You have logged {overtime:.1f} hours of overtime today",
                    threshold_value=daily_capacity,
                    actual_value=today_hours
                )
                self.repo.create_alert(alert)
    
    def _check_task_completion_alerts(self, task_id: str):
        """Check for task completion related alerts"""
        # Get actual vs estimated
        comparison = self.repo.get_task_actual_vs_estimated(task_id)
        
        if comparison["variance_percentage"] > 20:
            # Task took significantly longer than estimated
            alert = TimeTrackingAlert(
                alert_type=AlertType.DEADLINE_MISSED,
                severity="high",
                task_id=task_id,
                title="Task Overrun Alert",
                message=f"Task exceeded estimate by {comparison['variance_percentage']:.0f}%",
                threshold_value=comparison["estimated_minutes"],
                actual_value=comparison["actual_minutes"]
            )
            self.repo.create_alert(alert)
    
    def _check_burndown_alerts(self, burndown: SprintBurndown):
        """Check if burndown is off track"""
        if not burndown.data_points or not burndown.ideal_line:
            return
        
        # Get current progress
        latest_data = burndown.data_points[-1]
        current_date = date.fromisoformat(latest_data["date"])
        
        # Find corresponding ideal point
        ideal_point = None
        for point in burndown.ideal_line:
            if date.fromisoformat(point["date"]) == current_date:
                ideal_point = point
                break
        
        if not ideal_point:
            return
        
        # Check if actual is significantly behind ideal
        actual_remaining = latest_data["remaining"]
        ideal_remaining = ideal_point["remaining"]
        
        if actual_remaining > ideal_remaining * 1.2:  # 20% behind
            alert = TimeTrackingAlert(
                alert_type=AlertType.BURNDOWN_OFF_TRACK,
                severity="high",
                project_id=burndown.project_id,
                title="Burndown Off Track",
                message=f"Sprint burndown is {((actual_remaining / ideal_remaining - 1) * 100):.0f}% behind schedule",
                threshold_value=ideal_remaining,
                actual_value=actual_remaining
            )
            self.repo.create_alert(alert)
    
    def _create_budget_alert(self, project_id: str, budget: ProjectTimebudget, usage: float):
        """Create budget alert"""
        severity = "critical" if usage >= 100 else "high"
        
        alert = TimeTrackingAlert(
            alert_type=AlertType.BUDGET_EXCEEDED if usage >= 100 else AlertType.DEADLINE_APPROACHING,
            severity=severity,
            project_id=project_id,
            title="Project Budget Alert",
            message=f"Project has used {usage:.0f}% of time budget",
            threshold_value=budget.total_hours_budget,
            actual_value=budget.hours_used
        )
        
        self.repo.create_alert(alert)
    
    def _summarize_entries(self, entries: List[TimeEntry]) -> Dict[str, Any]:
        """Summarize a list of time entries"""
        if not entries:
            return {
                "total_entries": 0,
                "total_hours": 0,
                "billable_hours": 0,
                "total_cost": 0
            }
        
        total_hours = sum(e.duration_minutes or 0 for e in entries) / 60
        billable_hours = sum((e.duration_minutes or 0) for e in entries if e.billable) / 60
        total_cost = sum(e.total_cost or 0 for e in entries)
        
        return {
            "total_entries": len(entries),
            "total_hours": total_hours,
            "billable_hours": billable_hours,
            "non_billable_hours": total_hours - billable_hours,
            "total_cost": total_cost,
            "average_entry_duration": total_hours / len(entries) if entries else 0
        }
    
    def _generate_team_utilization_report(self, team_id: str, start_date: date,
                                        end_date: date) -> Dict[str, Any]:
        """Generate team utilization report"""
        # Get team capacity
        capacity = self.repo.get_team_capacity_utilization(team_id, date.today())
        
        # Get team members utilization
        # This would need team member data integration
        
        return {
            "team_id": team_id,
            "period": f"{start_date} to {end_date}",
            "capacity": capacity,
            "members": []  # Would be populated with member data
        }
    
    def _generate_user_utilization_report(self, user_id: str, start_date: date,
                                        end_date: date) -> Dict[str, Any]:
        """Generate user utilization report"""
        availability = self.get_user_availability(user_id, start_date, end_date)
        productivity = self.repo.get_user_productivity_stats(user_id, start_date, end_date)
        
        return {
            "user_id": user_id,
            "period": f"{start_date} to {end_date}",
            "availability": availability,
            "productivity": productivity
        }
    
    def _calculate_productivity_score(self, productivity_stats: Dict[str, Any]) -> float:
        """Calculate a productivity score (0-100)"""
        # Simple scoring based on:
        # - Days worked vs total days
        # - Average hours per day (optimal is 6-8)
        # - Billable percentage
        
        if productivity_stats["total_days"] == 0:
            return 0.0
        
        # Work consistency score (0-40)
        work_ratio = productivity_stats["days_worked"] / productivity_stats["total_days"]
        consistency_score = min(40, work_ratio * 50)
        
        # Hours balance score (0-30)
        avg_hours = productivity_stats["average_hours_per_day"]
        if 6 <= avg_hours <= 8:
            hours_score = 30
        elif 4 <= avg_hours < 6 or 8 < avg_hours <= 10:
            hours_score = 20
        else:
            hours_score = 10
        
        # Billable score (0-30)
        billable_score = productivity_stats["billable_percentage"] * 0.3
        
        return min(100, consistency_score + hours_score + billable_score)
    
    def _is_manager_or_admin(self, user_id: str) -> bool:
        """Check if user is manager or admin"""
        if not self.user_repo:
            return True  # Assume authorized if no user repo
        
        user = self.user_repo.get_user(user_id)
        return user and user.get("role") in ["manager", "admin"]