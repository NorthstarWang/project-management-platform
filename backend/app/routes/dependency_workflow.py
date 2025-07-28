"""
Dependency & Workflow Management API Routes

This module provides API endpoints for managing task dependencies,
workflows, and automated task progression.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from pydantic import BaseModel

from ..models.dependency_models import (
    TaskDependency, WorkflowTemplate, WorkflowStep, WorkflowInstance,
    DependencyType, WorkflowStatus, StepStatus, DependencyValidation,
    CriticalPathResult, CreateDependencyRequest, CreateWorkflowRequest,
    UpdateWorkflowRequest, TriggerWorkflowRequest, WorkflowProgress
)
from ..services.dependency_service import DependencyService
from ..dependencies import get_data_manager, track_event
from ..routes.dependencies import get_current_user


router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


def get_dependency_service():
    """Get dependency service from data manager"""
    data_manager = get_data_manager()
    return data_manager.dependency_service


# Task Dependency Endpoints

@router.post("/tasks/{task_id}/dependencies", response_model=TaskDependency)
async def create_task_dependency(
    task_id: str = Path(...),
    dependency_request: CreateDependencyRequest = Body(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Create a dependency between tasks"""
    try:
        dependency = service.create_dependency(
            task_id,
            dependency_request.depends_on_id,
            dependency_request.dependency_type,
            dependency_request.lag_time
        )
        
        # Log event
        event_tracker("DEPENDENCY_CREATE", {
            "user_id": current_user["id"],
            "task_id": task_id,
            "depends_on_id": dependency_request.depends_on_id,
            "dependency_type": dependency_request.dependency_type
        })
        
        return dependency
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tasks/{task_id}/dependencies", response_model=List[TaskDependency])
async def get_task_dependencies(
    task_id: str = Path(...),
    include_transitive: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get all dependencies for a task"""
    if include_transitive:
        return service.get_all_dependencies(task_id)
    return service.get_task_dependencies(task_id)


@router.get("/tasks/{task_id}/dependents", response_model=List[TaskDependency])
async def get_task_dependents(
    task_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get all tasks that depend on this task"""
    return service.get_task_dependents(task_id)


@router.delete("/dependencies/{dependency_id}")
async def delete_dependency(
    dependency_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Delete a task dependency"""
    try:
        success = service.delete_dependency(dependency_id)
        if not success:
            raise HTTPException(status_code=404, detail="Dependency not found")
        
        # Log event
        event_tracker("DEPENDENCY_DELETE", {
            "user_id": current_user["id"],
            "dependency_id": dependency_id
        })
        
        return {"message": "Dependency deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tasks/{task_id}/validate-dependencies", response_model=DependencyValidation)
async def validate_task_dependencies(
    task_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Validate dependencies for a task"""
    validation = service.validate_dependencies(task_id)
    return validation


@router.get("/projects/{project_id}/critical-path", response_model=CriticalPathResult)
async def get_critical_path(
    project_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Calculate critical path for a project"""
    try:
        result = service.calculate_critical_path(project_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_id}/dependency-graph", response_model=Dict[str, Any])
async def get_dependency_graph(
    project_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get dependency graph visualization data"""
    try:
        graph = service.get_dependency_graph(project_id)
        return graph
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Workflow Template Endpoints

@router.post("/workflows/templates", response_model=WorkflowTemplate)
async def create_workflow_template(
    workflow_request: CreateWorkflowRequest = Body(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Create a new workflow template"""
    try:
        template = service.create_workflow_template(
            workflow_request.name,
            workflow_request.description,
            workflow_request.board_id,
            workflow_request.steps,
            workflow_request.triggers
        )
        
        # Log event
        event_tracker("WORKFLOW_TEMPLATE_CREATE", {
            "user_id": current_user["id"],
            "template_id": template.id,
            "template_name": template.name,
            "board_id": template.board_id
        })
        
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workflows/templates", response_model=List[WorkflowTemplate])
async def get_workflow_templates(
    board_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get workflow templates"""
    return service.get_workflow_templates(board_id, is_active)


@router.get("/workflows/templates/{template_id}", response_model=WorkflowTemplate)
async def get_workflow_template(
    template_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get a specific workflow template"""
    template = service.get_workflow_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    return template


@router.put("/workflows/templates/{template_id}", response_model=WorkflowTemplate)
async def update_workflow_template(
    template_id: str = Path(...),
    update_request: UpdateWorkflowRequest = Body(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Update a workflow template"""
    try:
        template = service.update_workflow_template(
            template_id,
            update_request.dict(exclude_unset=True)
        )
        if not template:
            raise HTTPException(status_code=404, detail="Workflow template not found")
        
        # Log event
        event_tracker("WORKFLOW_TEMPLATE_UPDATE", {
            "user_id": current_user["id"],
            "template_id": template_id
        })
        
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/workflows/templates/{template_id}")
async def delete_workflow_template(
    template_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Delete a workflow template"""
    success = service.delete_workflow_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    
    # Log event
    event_tracker("WORKFLOW_TEMPLATE_DELETE", {
        "user_id": current_user["id"],
        "template_id": template_id
    })
    
    return {"message": "Workflow template deleted successfully"}


# Workflow Instance Endpoints

@router.post("/workflows/instances/trigger", response_model=WorkflowInstance)
async def trigger_workflow(
    trigger_request: TriggerWorkflowRequest = Body(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Trigger a workflow instance"""
    try:
        instance = service.trigger_workflow(
            trigger_request.template_id,
            trigger_request.trigger_task_id,
            current_user["id"],
            trigger_request.variables
        )
        
        # Log event
        event_tracker("WORKFLOW_TRIGGER", {
            "user_id": current_user["id"],
            "instance_id": instance.id,
            "template_id": trigger_request.template_id,
            "trigger_task_id": trigger_request.trigger_task_id
        })
        
        return instance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workflows/instances", response_model=List[WorkflowInstance])
async def get_workflow_instances(
    template_id: Optional[str] = Query(None),
    status: Optional[WorkflowStatus] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get workflow instances"""
    return service.get_workflow_instances(template_id, status)


@router.get("/workflows/instances/{instance_id}", response_model=WorkflowInstance)
async def get_workflow_instance(
    instance_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get a specific workflow instance"""
    instance = service.get_workflow_instance(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    return instance


@router.post("/workflows/instances/{instance_id}/advance")
async def advance_workflow(
    instance_id: str = Path(...),
    step_id: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Advance workflow to next step"""
    try:
        success = service.advance_workflow(instance_id, step_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to advance workflow")
        
        # Log event
        event_tracker("WORKFLOW_ADVANCE", {
            "user_id": current_user["id"],
            "instance_id": instance_id,
            "step_id": step_id
        })
        
        return {"message": "Workflow advanced successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/workflows/instances/{instance_id}/cancel")
async def cancel_workflow(
    instance_id: str = Path(...),
    reason: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service),
    event_tracker=Depends(track_event)
):
    """Cancel a workflow instance"""
    try:
        success = service.cancel_workflow(instance_id, reason)
        if not success:
            raise HTTPException(status_code=404, detail="Workflow instance not found")
        
        # Log event
        event_tracker("WORKFLOW_CANCEL", {
            "user_id": current_user["id"],
            "instance_id": instance_id,
            "reason": reason
        })
        
        return {"message": "Workflow cancelled successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workflows/instances/{instance_id}/progress", response_model=WorkflowProgress)
async def get_workflow_progress(
    instance_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get workflow progress"""
    progress = service.get_workflow_progress(instance_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    return progress


# Analytics Endpoints

@router.get("/analytics/workflow-performance/{template_id}")
async def get_workflow_performance(
    template_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Get workflow performance analytics"""
    try:
        analytics = service.get_workflow_analytics(template_id)
        return analytics
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/analytics/dependency-bottlenecks/{project_id}")
async def get_dependency_bottlenecks(
    project_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: DependencyService = Depends(get_dependency_service)
):
    """Identify dependency bottlenecks in a project"""
    try:
        bottlenecks = service.identify_bottlenecks(project_id)
        return bottlenecks
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))