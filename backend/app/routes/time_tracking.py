"""
Time & Progress Tracking API Routes

This module provides API endpoints for time tracking, progress monitoring,
and analytics functionality.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from pydantic import BaseModel

from ..models.time_tracking_models import (
    TimeEntry, Timer, TaskEstimate, TaskProgress, WorkPattern,
    SprintBurndown, TeamVelocity, TimeTrackingAlert, TimeSheet,
    ProjectTimebudget, CapacityPlan, TimeTrackingReport,
    TimeTrackingSettings, GitHubIntegration, CalendarIntegration,
    CreateTimeEntryRequest, StartTimerRequest, UpdateProgressRequest,
    GenerateReportRequest, TimeEntryFilter, TimeTrackingAnalytics,
    TimeEntryStatus, ProgressMetricType, ReportType, EstimateUnit
)
from ..services.time_tracking_service import TimeTrackingService
from ..dependencies import get_current_user, get_data_manager, track_event
from ..repositories.time_tracking_repository import TimeTrackingRepository


router = APIRouter(prefix="/api/time-tracking", tags=["time-tracking"])


# Helper function to get service
def get_time_tracking_service(data_manager=Depends(get_data_manager)) -> TimeTrackingService:
    """Get time tracking service instance"""
    return TimeTrackingService(
        time_tracking_repo=data_manager.time_tracking_repository,
        user_repo=data_manager.user_repository,
        task_repo=data_manager.task_repository,
        project_repo=data_manager.project_repository
    )


# Time Entry Endpoints

@router.post("/entries", response_model=TimeEntry)
async def create_time_entry(
    request: CreateTimeEntryRequest,
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Create a new time entry"""
    try:
        entry = service.create_time_entry(current_user["id"], request)
        
        # Log event
        event_track("TIME_ENTRY_CREATE", {
            "user_id": current_user["id"],
            "entry_id": entry.id,
            "task_id": entry.task_id,
            "project_id": entry.project_id,
            "duration_minutes": entry.duration_minutes,
            "billable": entry.billable
        })
        
        return entry
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/entries", response_model=List[TimeEntry])
async def get_time_entries(
    user_ids: Optional[List[str]] = Query(None),
    task_ids: Optional[List[str]] = Query(None),
    project_ids: Optional[List[str]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[List[TimeEntryStatus]] = Query(None),
    billable: Optional[bool] = Query(None),
    tags: Optional[List[str]] = Query(None),
    min_duration: Optional[int] = Query(None),
    max_duration: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get time entries with filtering"""
    filter_params = TimeEntryFilter(
        user_ids=user_ids,
        task_ids=task_ids,
        project_ids=project_ids,
        start_date=start_date,
        end_date=end_date,
        status=status,
        billable=billable,
        tags=tags,
        min_duration=min_duration,
        max_duration=max_duration
    )
    
    return service.get_time_entries(current_user["id"], filter_params)


@router.get("/entries/{entry_id}", response_model=TimeEntry)
async def get_time_entry(
    entry_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get a specific time entry"""
    entry = service.repo.get_time_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Check permissions
    if entry.user_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return entry


@router.put("/entries/{entry_id}", response_model=TimeEntry)
async def update_time_entry(
    entry_id: str = Path(...),
    updates: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Update a time entry"""
    try:
        entry = service.update_time_entry(current_user["id"], entry_id, updates)
        
        # Log event
        event_track("TIME_ENTRY_UPDATE", {
            "user_id": current_user["id"],
            "entry_id": entry_id,
            "updates": list(updates.keys())
        })
        
        return entry
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/entries/{entry_id}")
async def delete_time_entry(
    entry_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Delete a time entry"""
    try:
        success = service.delete_time_entry(current_user["id"], entry_id)
        if not success:
            raise HTTPException(status_code=404, detail="Time entry not found")
        
        # Log event
        event_track("TIME_ENTRY_DELETE", {
            "user_id": current_user["id"],
            "entry_id": entry_id
        })
        
        return {"message": "Time entry deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/entries/{entry_id}/approve", response_model=TimeEntry)
async def approve_time_entry(
    entry_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Approve a time entry"""
    try:
        entry = service.approve_time_entry(current_user["id"], entry_id)
        
        # Log event
        event_track("TIME_ENTRY_APPROVE", {
            "approver_id": current_user["id"],
            "entry_id": entry_id,
            "user_id": entry.user_id
        })
        
        return entry
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/entries/{entry_id}/reject", response_model=TimeEntry)
async def reject_time_entry(
    entry_id: str = Path(...),
    reason: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Reject a time entry"""
    try:
        entry = service.reject_time_entry(current_user["id"], entry_id, reason)
        
        # Log event
        event_track("TIME_ENTRY_REJECT", {
            "approver_id": current_user["id"],
            "entry_id": entry_id,
            "reason": reason
        })
        
        return entry
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# Timer Endpoints

@router.post("/timers", response_model=Timer)
async def start_timer(
    request: StartTimerRequest,
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Start a new timer"""
    try:
        timer = service.start_timer(current_user["id"], request)
        
        # Log event
        event_track("TIMER_START", {
            "user_id": current_user["id"],
            "timer_id": timer.id,
            "task_id": timer.task_id,
            "project_id": timer.project_id
        })
        
        return timer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/timers/active", response_model=Optional[Timer])
async def get_active_timer(
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get user's active timer"""
    return service.get_active_timer(current_user["id"])


@router.post("/timers/{timer_id}/stop", response_model=TimeEntry)
async def stop_timer(
    timer_id: str = Path(...),
    description: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Stop a timer and create time entry"""
    try:
        entry = service.stop_timer(current_user["id"], timer_id, description)
        
        # Log event
        event_track("TIMER_STOP", {
            "user_id": current_user["id"],
            "timer_id": timer_id,
            "entry_id": entry.id,
            "duration_minutes": entry.duration_minutes
        })
        
        return entry
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/timers/{timer_id}/pause", response_model=Timer)
async def pause_timer(
    timer_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Pause a running timer"""
    try:
        timer = service.pause_timer(current_user["id"], timer_id)
        
        # Log event
        event_track("TIMER_PAUSE", {
            "user_id": current_user["id"],
            "timer_id": timer_id
        })
        
        return timer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/timers/{timer_id}/resume", response_model=Timer)
async def resume_timer(
    timer_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Resume a paused timer"""
    try:
        timer = service.resume_timer(current_user["id"], timer_id)
        
        # Log event
        event_track("TIMER_RESUME", {
            "user_id": current_user["id"],
            "timer_id": timer_id
        })
        
        return timer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# Task Estimation & Progress Endpoints

@router.post("/tasks/{task_id}/estimate", response_model=TaskEstimate)
async def create_task_estimate(
    task_id: str = Path(...),
    estimated_value: float = Body(...),
    estimate_unit: EstimateUnit = Body(...),
    confidence_level: Optional[int] = Body(None),
    notes: Optional[str] = Body(None),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Create a task estimate"""
    try:
        estimate = TaskEstimate(
            task_id=task_id,
            estimated_value=estimated_value,
            estimate_unit=estimate_unit,
            confidence_level=confidence_level,
            estimated_by=current_user["id"],
            notes=notes
        )
        
        created_estimate = service.create_task_estimate(current_user["id"], task_id, estimate)
        
        # Log event
        event_track("TASK_ESTIMATE_CREATE", {
            "user_id": current_user["id"],
            "task_id": task_id,
            "estimate_id": created_estimate.id,
            "estimated_value": estimated_value,
            "estimate_unit": estimate_unit
        })
        
        return created_estimate
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tasks/{task_id}/estimates", response_model=List[TaskEstimate])
async def get_task_estimates(
    task_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get all estimates for a task"""
    return service.repo.get_task_estimates(task_id)


@router.post("/tasks/{task_id}/progress", response_model=TaskProgress)
async def update_task_progress(
    request: UpdateProgressRequest,
    task_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Update task progress"""
    try:
        request.task_id = task_id
        progress = service.update_task_progress(current_user["id"], request)
        
        # Log event
        event_track("TASK_PROGRESS_UPDATE", {
            "user_id": current_user["id"],
            "task_id": task_id,
            "progress_id": progress.id,
            "percentage_complete": progress.percentage_complete
        })
        
        return progress
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tasks/{task_id}/progress", response_model=List[TaskProgress])
async def get_task_progress(
    task_id: str = Path(...),
    metric_type: Optional[ProgressMetricType] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get task progress entries"""
    entries = service.repo.get_task_progress_entries(task_id)
    
    if metric_type:
        entries = [e for e in entries if e.metric_type == metric_type]
    
    return entries


@router.get("/tasks/{task_id}/time-summary")
async def get_task_time_summary(
    task_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get comprehensive time summary for a task"""
    return service.get_task_time_summary(task_id)


# Work Pattern Endpoints

@router.post("/work-patterns", response_model=WorkPattern)
async def create_work_pattern(
    pattern: WorkPattern,
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Create or update work pattern"""
    created_pattern = service.create_work_pattern(current_user["id"], pattern)
    
    # Log event
    event_track("WORK_PATTERN_CREATE", {
        "user_id": current_user["id"],
        "pattern_id": created_pattern.id,
        "pattern_type": created_pattern.pattern_type
    })
    
    return created_pattern


@router.get("/work-patterns/me", response_model=Optional[WorkPattern])
async def get_my_work_pattern(
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get current user's work pattern"""
    return service.repo.get_user_work_pattern(current_user["id"])


@router.get("/users/{user_id}/availability")
async def get_user_availability(
    user_id: str = Path(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get user availability for a date range"""
    # Check permissions
    if user_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return service.get_user_availability(user_id, start_date, end_date)


# Sprint & Velocity Endpoints

@router.post("/sprints/{sprint_id}/burndown", response_model=SprintBurndown)
async def create_sprint_burndown(
    sprint_id: str = Path(...),
    project_id: str = Body(...),
    start_date: date = Body(...),
    end_date: date = Body(...),
    total_points: float = Body(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Create a sprint burndown chart"""
    burndown = service.create_sprint_burndown(
        sprint_id, project_id, start_date, end_date, total_points
    )
    
    # Log event
    event_track("BURNDOWN_CREATE", {
        "user_id": current_user["id"],
        "burndown_id": burndown.id,
        "sprint_id": sprint_id,
        "project_id": project_id
    })
    
    return burndown


@router.post("/burndowns/{burndown_id}/progress")
async def update_burndown_progress(
    burndown_id: str = Path(...),
    completed_points: float = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Update burndown progress"""
    try:
        burndown = service.update_burndown_progress(burndown_id, completed_points)
        
        # Log event
        event_track("BURNDOWN_UPDATE", {
            "user_id": current_user["id"],
            "burndown_id": burndown_id,
            "completed_points": completed_points
        })
        
        return burndown
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_id}/burndowns", response_model=List[SprintBurndown])
async def get_project_burndowns(
    project_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get burndowns for a project"""
    return service.repo.get_project_burndowns(project_id)


@router.get("/teams/{team_id}/velocity")
async def get_team_velocity_trend(
    team_id: str = Path(...),
    periods: int = Query(6, ge=1, le=12),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get velocity trend for a team"""
    return service.get_velocity_trend(team_id, periods)


# Timesheet Endpoints

@router.post("/timesheets", response_model=TimeSheet)
async def create_timesheet(
    period_start: date = Body(...),
    period_end: date = Body(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Create a timesheet for a period"""
    timesheet = service.create_timesheet(current_user["id"], period_start, period_end)
    
    # Log event
    event_track("TIMESHEET_CREATE", {
        "user_id": current_user["id"],
        "timesheet_id": timesheet.id,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat()
    })
    
    return timesheet


@router.get("/timesheets", response_model=List[TimeSheet])
async def get_my_timesheets(
    status: Optional[TimeEntryStatus] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get current user's timesheets"""
    return service.repo.get_user_timesheets(current_user["id"], status)


@router.post("/timesheets/{timesheet_id}/submit", response_model=TimeSheet)
async def submit_timesheet(
    timesheet_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Submit a timesheet for approval"""
    try:
        timesheet = service.submit_timesheet(current_user["id"], timesheet_id)
        
        # Log event
        event_track("TIMESHEET_SUBMIT", {
            "user_id": current_user["id"],
            "timesheet_id": timesheet_id
        })
        
        return timesheet
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/timesheets/{timesheet_id}/approve", response_model=TimeSheet)
async def approve_timesheet(
    timesheet_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Approve a timesheet"""
    try:
        timesheet = service.approve_timesheet(current_user["id"], timesheet_id)
        
        # Log event
        event_track("TIMESHEET_APPROVE", {
            "approver_id": current_user["id"],
            "timesheet_id": timesheet_id,
            "user_id": timesheet.user_id
        })
        
        return timesheet
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# Budget Endpoints

@router.post("/projects/{project_id}/budget", response_model=ProjectTimebudget)
async def create_project_budget(
    budget: ProjectTimebudget,
    project_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Create time budget for a project"""
    if current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can create budgets")
    
    created_budget = service.create_project_budget(project_id, budget)
    
    # Log event
    event_track("BUDGET_CREATE", {
        "user_id": current_user["id"],
        "project_id": project_id,
        "budget_id": created_budget.id,
        "total_hours": created_budget.total_hours_budget
    })
    
    return created_budget


@router.get("/projects/{project_id}/budget-status")
async def get_project_budget_status(
    project_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get current budget status for a project"""
    return service.get_project_budget_status(project_id)


# Alert Endpoints

@router.get("/alerts", response_model=List[TimeTrackingAlert])
async def get_my_alerts(
    acknowledged: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get current user's alerts"""
    return service.repo.get_user_alerts(current_user["id"], acknowledged)


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Acknowledge an alert"""
    alert = service.repo.acknowledge_alert(alert_id, current_user["id"])
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Log event
    event_track("ALERT_ACKNOWLEDGE", {
        "user_id": current_user["id"],
        "alert_id": alert_id,
        "alert_type": alert.alert_type
    })
    
    return {"message": "Alert acknowledged"}


# Analytics & Reporting Endpoints

@router.post("/reports", response_model=TimeTrackingReport)
async def generate_report(
    request: GenerateReportRequest,
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Generate a time tracking report"""
    report = service.generate_report(current_user["id"], request)
    
    # Log event
    event_track("REPORT_GENERATE", {
        "user_id": current_user["id"],
        "report_id": report.id,
        "report_type": report.report_type
    })
    
    return report


@router.get("/reports", response_model=List[TimeTrackingReport])
async def get_my_reports(
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get reports generated by current user"""
    return service.repo.get_user_reports(current_user["id"])


@router.get("/analytics/me")
async def get_my_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get comprehensive analytics for current user"""
    analytics = service.get_time_tracking_analytics(
        current_user["id"], start_date, end_date
    )
    return analytics


@router.get("/analytics/users/{user_id}")
async def get_user_analytics(
    user_id: str = Path(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get analytics for a specific user"""
    # Check permissions
    if current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics = service.get_time_tracking_analytics(user_id, start_date, end_date)
    return analytics


# Settings Endpoints

@router.get("/settings/{entity_type}/{entity_id}", response_model=Optional[TimeTrackingSettings])
async def get_time_tracking_settings(
    entity_type: str = Path(...),
    entity_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get time tracking settings for an entity"""
    # Check permissions
    if entity_type == "user" and entity_id != current_user["id"]:
        if current_user["role"] not in ["manager", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return service.get_time_tracking_settings(entity_type, entity_id)


@router.put("/settings/{entity_type}/{entity_id}", response_model=TimeTrackingSettings)
async def update_time_tracking_settings(
    settings: TimeTrackingSettings,
    entity_type: str = Path(...),
    entity_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Update time tracking settings"""
    # Check permissions
    if entity_type == "user" and entity_id != current_user["id"]:
        if current_user["role"] not in ["manager", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif entity_type in ["team", "project", "organization"]:
        if current_user["role"] not in ["manager", "admin"]:
            raise HTTPException(status_code=403, detail="Only managers and admins can update settings")
    
    updated_settings = service.update_time_tracking_settings(entity_type, entity_id, settings)
    
    # Log event
    event_track("SETTINGS_UPDATE", {
        "user_id": current_user["id"],
        "entity_type": entity_type,
        "entity_id": entity_id,
        "tracking_mode": updated_settings.tracking_mode
    })
    
    return updated_settings


# Integration Endpoints

@router.post("/integrations/github", response_model=GitHubIntegration)
async def setup_github_integration(
    github_username: str = Body(...),
    auto_track_commits: bool = Body(True),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Setup GitHub integration"""
    try:
        integration = service.setup_github_integration(
            current_user["id"], github_username, auto_track_commits
        )
        
        # Log event
        event_track("INTEGRATION_GITHUB_SETUP", {
            "user_id": current_user["id"],
            "github_username": github_username
        })
        
        return integration
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/integrations/calendar", response_model=CalendarIntegration)
async def setup_calendar_integration(
    calendar_type: str = Body(...),
    calendar_id: str = Body(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Setup calendar integration"""
    integration = service.setup_calendar_integration(
        current_user["id"], calendar_type, calendar_id
    )
    
    # Log event
    event_track("INTEGRATION_CALENDAR_SETUP", {
        "user_id": current_user["id"],
        "calendar_type": calendar_type
    })
    
    return integration


# Capacity Planning Endpoints

@router.post("/teams/{team_id}/capacity-plan", response_model=CapacityPlan)
async def create_capacity_plan(
    team_id: str = Path(...),
    start_date: date = Body(...),
    end_date: date = Body(...),
    team_member_ids: List[str] = Body(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    event_track=Depends(track_event)
):
    """Create capacity plan for a team"""
    if current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can create capacity plans")
    
    plan = service.create_capacity_plan(team_id, start_date, end_date, team_member_ids)
    
    # Log event
    event_track("CAPACITY_PLAN_CREATE", {
        "user_id": current_user["id"],
        "team_id": team_id,
        "plan_id": plan.id
    })
    
    return plan


@router.get("/teams/{team_id}/capacity-plans", response_model=List[CapacityPlan])
async def get_team_capacity_plans(
    team_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service)
):
    """Get capacity plans for a team"""
    return service.repo.get_team_capacity_plans(team_id)