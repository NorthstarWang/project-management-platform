"""
Time & Progress Tracking Repository

This module provides in-memory storage and retrieval for time tracking data.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, timezone
from collections import defaultdict
import statistics

from ..models.time_tracking_models import (
    TimeEntry, Timer, TaskEstimate, TaskProgress, WorkPattern,
    SprintBurndown, TeamVelocity, TimeTrackingAlert, TimeSheet,
    ProjectTimebudget, CapacityPlan, TimeTrackingReport,
    TimeTrackingSettings, GitHubIntegration, CalendarIntegration,
    TimeEntryStatus, TimerState, TimeEntryFilter,
    ProgressMetricType, BurndownType, VelocityPeriod
)


class TimeTrackingRepository:
    """Repository for time tracking data management"""
    
    def __init__(self):
        # Core storage
        self.time_entries: Dict[str, TimeEntry] = {}
        self.timers: Dict[str, Timer] = {}
        self.task_estimates: Dict[str, TaskEstimate] = {}
        self.task_progress: Dict[str, TaskProgress] = {}
        self.work_patterns: Dict[str, WorkPattern] = {}
        
        # Analytics storage
        self.sprint_burndowns: Dict[str, SprintBurndown] = {}
        self.team_velocities: Dict[str, TeamVelocity] = {}
        self.time_tracking_alerts: Dict[str, TimeTrackingAlert] = {}
        self.timesheets: Dict[str, TimeSheet] = {}
        self.project_timebudgets: Dict[str, ProjectTimebudget] = {}
        self.capacity_plans: Dict[str, CapacityPlan] = {}
        
        # Reports and settings
        self.time_tracking_reports: Dict[str, TimeTrackingReport] = {}
        self.time_tracking_settings: Dict[str, TimeTrackingSettings] = {}
        
        # Integrations
        self.github_integrations: Dict[str, GitHubIntegration] = {}
        self.calendar_integrations: Dict[str, CalendarIntegration] = {}
        
        # Indexes for efficient querying
        self.entries_by_user: Dict[str, List[str]] = defaultdict(list)
        self.entries_by_task: Dict[str, List[str]] = defaultdict(list)
        self.entries_by_project: Dict[str, List[str]] = defaultdict(list)
        self.timers_by_user: Dict[str, List[str]] = defaultdict(list)
        self.estimates_by_task: Dict[str, List[str]] = defaultdict(list)
        self.progress_by_task: Dict[str, List[str]] = defaultdict(list)
        self.alerts_by_user: Dict[str, List[str]] = defaultdict(list)
        self.burndowns_by_project: Dict[str, List[str]] = defaultdict(list)
        self.velocities_by_team: Dict[str, List[str]] = defaultdict(list)
    
    # Time Entry Methods
    
    def create_time_entry(self, entry: TimeEntry) -> TimeEntry:
        """Create a new time entry"""
        self.time_entries[entry.id] = entry
        self.entries_by_user[entry.user_id].append(entry.id)
        if entry.task_id:
            self.entries_by_task[entry.task_id].append(entry.id)
        if entry.project_id:
            self.entries_by_project[entry.project_id].append(entry.id)
        return entry
    
    def get_time_entry(self, entry_id: str) -> Optional[TimeEntry]:
        """Get a time entry by ID"""
        return self.time_entries.get(entry_id)
    
    def update_time_entry(self, entry_id: str, updates: Dict[str, Any]) -> Optional[TimeEntry]:
        """Update a time entry"""
        entry = self.time_entries.get(entry_id)
        if not entry:
            return None
        
        for key, value in updates.items():
            if hasattr(entry, key):
                setattr(entry, key, value)
        
        entry.updated_at = datetime.now(timezone.utc)
        
        # Recalculate duration and cost if times changed
        if 'start_time' in updates or 'end_time' in updates:
            if entry.start_time and entry.end_time:
                duration = (entry.end_time - entry.start_time).total_seconds() / 60
                entry.duration_minutes = int(duration)
                
                if entry.rate_per_hour and entry.billable:
                    entry.total_cost = (duration / 60) * entry.rate_per_hour
        
        return entry
    
    def delete_time_entry(self, entry_id: str) -> bool:
        """Delete a time entry"""
        entry = self.time_entries.get(entry_id)
        if not entry:
            return False
        
        del self.time_entries[entry_id]
        self.entries_by_user[entry.user_id].remove(entry_id)
        if entry.task_id and entry_id in self.entries_by_task[entry.task_id]:
            self.entries_by_task[entry.task_id].remove(entry_id)
        if entry.project_id and entry_id in self.entries_by_project[entry.project_id]:
            self.entries_by_project[entry.project_id].remove(entry_id)
        
        return True
    
    def filter_time_entries(self, filter_params: TimeEntryFilter) -> List[TimeEntry]:
        """Filter time entries based on criteria"""
        entries = list(self.time_entries.values())
        
        if filter_params.user_ids:
            entries = [e for e in entries if e.user_id in filter_params.user_ids]
        
        if filter_params.task_ids:
            entries = [e for e in entries if e.task_id in filter_params.task_ids]
        
        if filter_params.project_ids:
            entries = [e for e in entries if e.project_id in filter_params.project_ids]
        
        if filter_params.start_date:
            entries = [e for e in entries if e.start_time.date() >= filter_params.start_date]
        
        if filter_params.end_date:
            entries = [e for e in entries if e.start_time.date() <= filter_params.end_date]
        
        if filter_params.status:
            entries = [e for e in entries if e.status in filter_params.status]
        
        if filter_params.billable is not None:
            entries = [e for e in entries if e.billable == filter_params.billable]
        
        if filter_params.tags:
            entries = [e for e in entries if any(tag in e.tags for tag in filter_params.tags)]
        
        if filter_params.min_duration:
            entries = [e for e in entries if e.duration_minutes and e.duration_minutes >= filter_params.min_duration]
        
        if filter_params.max_duration:
            entries = [e for e in entries if e.duration_minutes and e.duration_minutes <= filter_params.max_duration]
        
        return sorted(entries, key=lambda x: x.start_time, reverse=True)
    
    def get_user_time_entries(self, user_id: str, start_date: Optional[date] = None, 
                             end_date: Optional[date] = None) -> List[TimeEntry]:
        """Get time entries for a user"""
        entry_ids = self.entries_by_user.get(user_id, [])
        entries = [self.time_entries[id] for id in entry_ids if id in self.time_entries]
        
        if start_date:
            entries = [e for e in entries if e.start_time.date() >= start_date]
        if end_date:
            entries = [e for e in entries if e.start_time.date() <= end_date]
        
        return sorted(entries, key=lambda x: x.start_time, reverse=True)
    
    def get_task_time_entries(self, task_id: str) -> List[TimeEntry]:
        """Get all time entries for a task"""
        entry_ids = self.entries_by_task.get(task_id, [])
        entries = [self.time_entries[id] for id in entry_ids if id in self.time_entries]
        return sorted(entries, key=lambda x: x.start_time, reverse=True)
    
    def get_project_time_entries(self, project_id: str) -> List[TimeEntry]:
        """Get all time entries for a project"""
        entry_ids = self.entries_by_project.get(project_id, [])
        entries = [self.time_entries[id] for id in entry_ids if id in self.time_entries]
        return sorted(entries, key=lambda x: x.start_time, reverse=True)
    
    # Timer Methods
    
    def create_timer(self, timer: Timer) -> Timer:
        """Create a new timer"""
        self.timers[timer.id] = timer
        self.timers_by_user[timer.user_id].append(timer.id)
        return timer
    
    def get_timer(self, timer_id: str) -> Optional[Timer]:
        """Get a timer by ID"""
        return self.timers.get(timer_id)
    
    def get_user_active_timer(self, user_id: str) -> Optional[Timer]:
        """Get user's active timer"""
        timer_ids = self.timers_by_user.get(user_id, [])
        for timer_id in timer_ids:
            timer = self.timers.get(timer_id)
            if timer and timer.state == TimerState.RUNNING:
                return timer
        return None
    
    def update_timer(self, timer_id: str, updates: Dict[str, Any]) -> Optional[Timer]:
        """Update a timer"""
        timer = self.timers.get(timer_id)
        if not timer:
            return None
        
        for key, value in updates.items():
            if hasattr(timer, key):
                setattr(timer, key, value)
        
        return timer
    
    def delete_timer(self, timer_id: str) -> bool:
        """Delete a timer"""
        timer = self.timers.get(timer_id)
        if not timer:
            return False
        
        del self.timers[timer_id]
        self.timers_by_user[timer.user_id].remove(timer_id)
        return True
    
    def stop_all_user_timers(self, user_id: str) -> List[Timer]:
        """Stop all timers for a user"""
        stopped_timers = []
        timer_ids = self.timers_by_user.get(user_id, [])
        
        for timer_id in timer_ids:
            timer = self.timers.get(timer_id)
            if timer and timer.state == TimerState.RUNNING:
                timer.state = TimerState.STOPPED
                stopped_timers.append(timer)
        
        return stopped_timers
    
    # Task Estimate Methods
    
    def create_task_estimate(self, estimate: TaskEstimate) -> TaskEstimate:
        """Create a new task estimate"""
        self.task_estimates[estimate.id] = estimate
        self.estimates_by_task[estimate.task_id].append(estimate.id)
        return estimate
    
    def get_task_estimate(self, estimate_id: str) -> Optional[TaskEstimate]:
        """Get a task estimate by ID"""
        return self.task_estimates.get(estimate_id)
    
    def get_task_estimates(self, task_id: str) -> List[TaskEstimate]:
        """Get all estimates for a task"""
        estimate_ids = self.estimates_by_task.get(task_id, [])
        estimates = [self.task_estimates[id] for id in estimate_ids if id in self.task_estimates]
        return sorted(estimates, key=lambda x: x.created_at, reverse=True)
    
    def get_latest_task_estimate(self, task_id: str) -> Optional[TaskEstimate]:
        """Get the latest estimate for a task"""
        estimates = self.get_task_estimates(task_id)
        return estimates[0] if estimates else None
    
    # Task Progress Methods
    
    def create_task_progress(self, progress: TaskProgress) -> TaskProgress:
        """Create a new task progress entry"""
        self.task_progress[progress.id] = progress
        self.progress_by_task[progress.task_id].append(progress.id)
        return progress
    
    def get_task_progress(self, progress_id: str) -> Optional[TaskProgress]:
        """Get a task progress entry by ID"""
        return self.task_progress.get(progress_id)
    
    def get_task_progress_entries(self, task_id: str) -> List[TaskProgress]:
        """Get all progress entries for a task"""
        progress_ids = self.progress_by_task.get(task_id, [])
        entries = [self.task_progress[id] for id in progress_ids if id in self.task_progress]
        return sorted(entries, key=lambda x: x.created_at, reverse=True)
    
    def get_latest_task_progress(self, task_id: str, metric_type: Optional[ProgressMetricType] = None) -> Optional[TaskProgress]:
        """Get the latest progress entry for a task"""
        entries = self.get_task_progress_entries(task_id)
        if metric_type:
            entries = [e for e in entries if e.metric_type == metric_type]
        return entries[0] if entries else None
    
    # Work Pattern Methods
    
    def create_work_pattern(self, pattern: WorkPattern) -> WorkPattern:
        """Create a new work pattern"""
        self.work_patterns[pattern.id] = pattern
        return pattern
    
    def get_work_pattern(self, pattern_id: str) -> Optional[WorkPattern]:
        """Get a work pattern by ID"""
        return self.work_patterns.get(pattern_id)
    
    def get_user_work_pattern(self, user_id: str) -> Optional[WorkPattern]:
        """Get work pattern for a user"""
        for pattern in self.work_patterns.values():
            if pattern.user_id == user_id:
                return pattern
        return None
    
    def update_work_pattern(self, pattern_id: str, updates: Dict[str, Any]) -> Optional[WorkPattern]:
        """Update a work pattern"""
        pattern = self.work_patterns.get(pattern_id)
        if not pattern:
            return None
        
        for key, value in updates.items():
            if hasattr(pattern, key):
                setattr(pattern, key, value)
        
        pattern.updated_at = datetime.now(timezone.utc)
        return pattern
    
    # Sprint Burndown Methods
    
    def create_sprint_burndown(self, burndown: SprintBurndown) -> SprintBurndown:
        """Create a new sprint burndown"""
        self.sprint_burndowns[burndown.id] = burndown
        self.burndowns_by_project[burndown.project_id].append(burndown.id)
        return burndown
    
    def get_sprint_burndown(self, burndown_id: str) -> Optional[SprintBurndown]:
        """Get a sprint burndown by ID"""
        return self.sprint_burndowns.get(burndown_id)
    
    def get_sprint_burndowns(self, sprint_id: str) -> List[SprintBurndown]:
        """Get all burndowns for a sprint"""
        burndowns = []
        for burndown in self.sprint_burndowns.values():
            if burndown.sprint_id == sprint_id:
                burndowns.append(burndown)
        return sorted(burndowns, key=lambda x: x.created_at, reverse=True)
    
    def get_project_burndowns(self, project_id: str, burndown_type: Optional[BurndownType] = None) -> List[SprintBurndown]:
        """Get all burndowns for a project"""
        burndown_ids = self.burndowns_by_project.get(project_id, [])
        burndowns = [self.sprint_burndowns[id] for id in burndown_ids if id in self.sprint_burndowns]
        
        if burndown_type:
            burndowns = [b for b in burndowns if b.burndown_type == burndown_type]
        
        return sorted(burndowns, key=lambda x: x.created_at, reverse=True)
    
    # Team Velocity Methods
    
    def create_team_velocity(self, velocity: TeamVelocity) -> TeamVelocity:
        """Create a new team velocity entry"""
        self.team_velocities[velocity.id] = velocity
        self.velocities_by_team[velocity.team_id].append(velocity.id)
        return velocity
    
    def get_team_velocity(self, velocity_id: str) -> Optional[TeamVelocity]:
        """Get a team velocity entry by ID"""
        return self.team_velocities.get(velocity_id)
    
    def get_team_velocities(self, team_id: str, period: Optional[VelocityPeriod] = None) -> List[TeamVelocity]:
        """Get velocity entries for a team"""
        velocity_ids = self.velocities_by_team.get(team_id, [])
        velocities = [self.team_velocities[id] for id in velocity_ids if id in self.team_velocities]
        
        if period:
            velocities = [v for v in velocities if v.period == period]
        
        return sorted(velocities, key=lambda x: x.period_start, reverse=True)
    
    def get_team_average_velocity(self, team_id: str, periods: int = 3) -> float:
        """Calculate average velocity over last N periods"""
        velocities = self.get_team_velocities(team_id)[:periods]
        if not velocities:
            return 0.0
        return statistics.mean([v.velocity for v in velocities])
    
    # Alert Methods
    
    def create_alert(self, alert: TimeTrackingAlert) -> TimeTrackingAlert:
        """Create a new alert"""
        self.time_tracking_alerts[alert.id] = alert
        if alert.user_id:
            self.alerts_by_user[alert.user_id].append(alert.id)
        return alert
    
    def get_alert(self, alert_id: str) -> Optional[TimeTrackingAlert]:
        """Get an alert by ID"""
        return self.time_tracking_alerts.get(alert_id)
    
    def get_user_alerts(self, user_id: str, acknowledged: Optional[bool] = None) -> List[TimeTrackingAlert]:
        """Get alerts for a user"""
        alert_ids = self.alerts_by_user.get(user_id, [])
        alerts = [self.time_tracking_alerts[id] for id in alert_ids if id in self.time_tracking_alerts]
        
        if acknowledged is not None:
            alerts = [a for a in alerts if a.acknowledged == acknowledged]
        
        return sorted(alerts, key=lambda x: x.created_at, reverse=True)
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> Optional[TimeTrackingAlert]:
        """Acknowledge an alert"""
        alert = self.time_tracking_alerts.get(alert_id)
        if not alert:
            return None
        
        alert.acknowledged = True
        alert.acknowledged_by = user_id
        alert.acknowledged_at = datetime.now(timezone.utc)
        return alert
    
    # Timesheet Methods
    
    def create_timesheet(self, timesheet: TimeSheet) -> TimeSheet:
        """Create a new timesheet"""
        self.timesheets[timesheet.id] = timesheet
        return timesheet
    
    def get_timesheet(self, timesheet_id: str) -> Optional[TimeSheet]:
        """Get a timesheet by ID"""
        return self.timesheets.get(timesheet_id)
    
    def get_user_timesheets(self, user_id: str, status: Optional[TimeEntryStatus] = None) -> List[TimeSheet]:
        """Get timesheets for a user"""
        timesheets = [ts for ts in self.timesheets.values() if ts.user_id == user_id]
        
        if status:
            timesheets = [ts for ts in timesheets if ts.status == status]
        
        return sorted(timesheets, key=lambda x: x.period_start, reverse=True)
    
    def get_timesheet_by_period(self, user_id: str, period_start: date, period_end: date) -> Optional[TimeSheet]:
        """Get timesheet for a specific period"""
        for timesheet in self.timesheets.values():
            if (timesheet.user_id == user_id and 
                timesheet.period_start == period_start and 
                timesheet.period_end == period_end):
                return timesheet
        return None
    
    # Project Budget Methods
    
    def create_project_timebudget(self, budget: ProjectTimebudget) -> ProjectTimebudget:
        """Create a new project time budget"""
        self.project_timebudgets[budget.id] = budget
        return budget
    
    def get_project_timebudget(self, budget_id: str) -> Optional[ProjectTimebudget]:
        """Get a project time budget by ID"""
        return self.project_timebudgets.get(budget_id)
    
    def get_project_timebudgets(self, project_id: str) -> List[ProjectTimebudget]:
        """Get all time budgets for a project"""
        budgets = [b for b in self.project_timebudgets.values() if b.project_id == project_id]
        return sorted(budgets, key=lambda x: x.created_at, reverse=True)
    
    def get_active_project_budget(self, project_id: str) -> Optional[ProjectTimebudget]:
        """Get active budget for a project"""
        budgets = self.get_project_timebudgets(project_id)
        now = date.today()
        
        for budget in budgets:
            if budget.period_start and budget.period_end:
                if budget.period_start <= now <= budget.period_end:
                    return budget
            elif not budget.period_start and not budget.period_end:
                # No period specified means always active
                return budget
        
        return budgets[0] if budgets else None
    
    # Capacity Planning Methods
    
    def create_capacity_plan(self, plan: CapacityPlan) -> CapacityPlan:
        """Create a new capacity plan"""
        self.capacity_plans[plan.id] = plan
        return plan
    
    def get_capacity_plan(self, plan_id: str) -> Optional[CapacityPlan]:
        """Get a capacity plan by ID"""
        return self.capacity_plans.get(plan_id)
    
    def get_team_capacity_plans(self, team_id: str) -> List[CapacityPlan]:
        """Get capacity plans for a team"""
        plans = [p for p in self.capacity_plans.values() if p.team_id == team_id]
        return sorted(plans, key=lambda x: x.period_start, reverse=True)
    
    def get_active_capacity_plan(self, team_id: str) -> Optional[CapacityPlan]:
        """Get active capacity plan for a team"""
        plans = self.get_team_capacity_plans(team_id)
        now = date.today()
        
        for plan in plans:
            if plan.period_start <= now <= plan.period_end:
                return plan
        
        return None
    
    # Report Methods
    
    def create_report(self, report: TimeTrackingReport) -> TimeTrackingReport:
        """Create a new report"""
        self.time_tracking_reports[report.id] = report
        return report
    
    def get_report(self, report_id: str) -> Optional[TimeTrackingReport]:
        """Get a report by ID"""
        return self.time_tracking_reports.get(report_id)
    
    def get_user_reports(self, user_id: str) -> List[TimeTrackingReport]:
        """Get reports generated by a user"""
        reports = [r for r in self.time_tracking_reports.values() if r.generated_by == user_id]
        return sorted(reports, key=lambda x: x.created_at, reverse=True)
    
    # Settings Methods
    
    def create_settings(self, settings: TimeTrackingSettings) -> TimeTrackingSettings:
        """Create new time tracking settings"""
        self.time_tracking_settings[settings.id] = settings
        return settings
    
    def get_settings(self, settings_id: str) -> Optional[TimeTrackingSettings]:
        """Get settings by ID"""
        return self.time_tracking_settings.get(settings_id)
    
    def get_entity_settings(self, entity_type: str, entity_id: str) -> Optional[TimeTrackingSettings]:
        """Get settings for a specific entity"""
        for settings in self.time_tracking_settings.values():
            if settings.entity_type == entity_type and settings.entity_id == entity_id:
                return settings
        return None
    
    def update_settings(self, settings_id: str, updates: Dict[str, Any]) -> Optional[TimeTrackingSettings]:
        """Update time tracking settings"""
        settings = self.time_tracking_settings.get(settings_id)
        if not settings:
            return None
        
        for key, value in updates.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        settings.updated_at = datetime.now(timezone.utc)
        return settings
    
    # Integration Methods
    
    def create_github_integration(self, integration: GitHubIntegration) -> GitHubIntegration:
        """Create a GitHub integration"""
        self.github_integrations[integration.id] = integration
        return integration
    
    def get_github_integration(self, integration_id: str) -> Optional[GitHubIntegration]:
        """Get a GitHub integration by ID"""
        return self.github_integrations.get(integration_id)
    
    def get_user_github_integration(self, user_id: str) -> Optional[GitHubIntegration]:
        """Get GitHub integration for a user"""
        for integration in self.github_integrations.values():
            if integration.user_id == user_id:
                return integration
        return None
    
    def create_calendar_integration(self, integration: CalendarIntegration) -> CalendarIntegration:
        """Create a calendar integration"""
        self.calendar_integrations[integration.id] = integration
        return integration
    
    def get_calendar_integration(self, integration_id: str) -> Optional[CalendarIntegration]:
        """Get a calendar integration by ID"""
        return self.calendar_integrations.get(integration_id)
    
    def get_user_calendar_integrations(self, user_id: str) -> List[CalendarIntegration]:
        """Get calendar integrations for a user"""
        integrations = [i for i in self.calendar_integrations.values() if i.user_id == user_id]
        return sorted(integrations, key=lambda x: x.created_at, reverse=True)
    
    # Analytics Methods
    
    def calculate_user_hours(self, user_id: str, start_date: date, end_date: date) -> Dict[str, float]:
        """Calculate total hours for a user in a date range"""
        entries = self.get_user_time_entries(user_id, start_date, end_date)
        
        total_hours = 0.0
        billable_hours = 0.0
        non_billable_hours = 0.0
        
        for entry in entries:
            if entry.duration_minutes:
                hours = entry.duration_minutes / 60
                total_hours += hours
                if entry.billable:
                    billable_hours += hours
                else:
                    non_billable_hours += hours
        
        return {
            "total": total_hours,
            "billable": billable_hours,
            "non_billable": non_billable_hours
        }
    
    def calculate_project_hours(self, project_id: str) -> Dict[str, float]:
        """Calculate total hours for a project"""
        entries = self.get_project_time_entries(project_id)
        
        total_hours = 0.0
        total_cost = 0.0
        users_hours = defaultdict(float)
        
        for entry in entries:
            if entry.duration_minutes:
                hours = entry.duration_minutes / 60
                total_hours += hours
                users_hours[entry.user_id] += hours
                if entry.total_cost:
                    total_cost += entry.total_cost
        
        return {
            "total_hours": total_hours,
            "total_cost": total_cost,
            "users": dict(users_hours)
        }
    
    def get_task_actual_vs_estimated(self, task_id: str) -> Dict[str, Any]:
        """Compare actual vs estimated time for a task"""
        # Get actual time
        entries = self.get_task_time_entries(task_id)
        actual_minutes = sum(e.duration_minutes or 0 for e in entries)
        
        # Get latest estimate
        estimate = self.get_latest_task_estimate(task_id)
        estimated_minutes = 0
        if estimate:
            if estimate.estimate_unit == "minutes":
                estimated_minutes = estimate.estimated_value
            elif estimate.estimate_unit == "hours":
                estimated_minutes = estimate.estimated_value * 60
            elif estimate.estimate_unit == "days":
                estimated_minutes = estimate.estimated_value * 8 * 60  # 8 hour days
        
        variance = actual_minutes - estimated_minutes if estimated_minutes > 0 else 0
        variance_percentage = (variance / estimated_minutes * 100) if estimated_minutes > 0 else 0
        
        return {
            "actual_minutes": actual_minutes,
            "estimated_minutes": estimated_minutes,
            "variance_minutes": variance,
            "variance_percentage": variance_percentage,
            "estimate": estimate
        }
    
    def get_user_productivity_stats(self, user_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calculate productivity statistics for a user"""
        entries = self.get_user_time_entries(user_id, start_date, end_date)
        
        if not entries:
            return {
                "total_days": 0,
                "days_worked": 0,
                "average_hours_per_day": 0,
                "total_hours": 0,
                "billable_percentage": 0,
                "most_productive_day": None,
                "task_distribution": {}
            }
        
        # Group entries by date
        entries_by_date = defaultdict(list)
        for entry in entries:
            entries_by_date[entry.start_time.date()].append(entry)
        
        # Calculate statistics
        total_days = (end_date - start_date).days + 1
        days_worked = len(entries_by_date)
        
        daily_hours = []
        most_productive_day = None
        max_hours = 0
        
        for day_date, day_entries in entries_by_date.items():
            day_hours = sum(e.duration_minutes or 0 for e in day_entries) / 60
            daily_hours.append(day_hours)
            
            if day_hours > max_hours:
                max_hours = day_hours
                most_productive_day = day_date
        
        hours_data = self.calculate_user_hours(user_id, start_date, end_date)
        
        # Task distribution
        task_hours = defaultdict(float)
        for entry in entries:
            if entry.task_id and entry.duration_minutes:
                task_hours[entry.task_id] += entry.duration_minutes / 60
        
        return {
            "total_days": total_days,
            "days_worked": days_worked,
            "average_hours_per_day": statistics.mean(daily_hours) if daily_hours else 0,
            "total_hours": hours_data["total"],
            "billable_percentage": (hours_data["billable"] / hours_data["total"] * 100) if hours_data["total"] > 0 else 0,
            "most_productive_day": most_productive_day,
            "task_distribution": dict(task_hours)
        }
    
    def get_team_capacity_utilization(self, team_id: str, date: date) -> Dict[str, Any]:
        """Calculate team capacity utilization"""
        plan = self.get_active_capacity_plan(team_id)
        if not plan:
            return {
                "capacity_hours": 0,
                "allocated_hours": 0,
                "utilization_percentage": 0,
                "available_hours": 0
            }
        
        return {
            "capacity_hours": plan.total_capacity_hours,
            "allocated_hours": plan.allocated_hours,
            "utilization_percentage": (plan.allocated_hours / plan.total_capacity_hours * 100) 
                                    if plan.total_capacity_hours > 0 else 0,
            "available_hours": plan.available_hours
        }