"""
Dependency & Workflow Models

Pydantic models for task dependencies and workflow management.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class DependencyType(str, Enum):
    """Types of task dependencies"""
    FINISH_TO_START = "finish_to_start"  # Default: B can't start until A finishes
    START_TO_START = "start_to_start"    # B can't start until A starts
    FINISH_TO_FINISH = "finish_to_finish"  # B can't finish until A finishes
    START_TO_FINISH = "start_to_finish"   # B can't finish until A starts (rare)


class WorkflowStatus(str, Enum):
    """Workflow instance status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepStatus(str, Enum):
    """Workflow step execution status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


class ActionType(str, Enum):
    """Types of workflow actions"""
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    MOVE_TASK = "move_task"
    ASSIGN_TASK = "assign_task"
    ADD_COMMENT = "add_comment"
    SEND_NOTIFICATION = "send_notification"
    CREATE_SUBTASK = "create_subtask"
    UPDATE_CUSTOM_FIELD = "update_custom_field"
    TRIGGER_WEBHOOK = "trigger_webhook"


# Task Dependency Models

class TaskDependency(BaseModel):
    """Task dependency model"""
    id: str
    task_id: str
    depends_on_id: str
    dependency_type: DependencyType = DependencyType.FINISH_TO_START
    lag_time: int = Field(0, description="Lag time in hours")
    created_at: datetime
    updated_at: datetime


class CreateDependencyRequest(BaseModel):
    """Request to create a task dependency"""
    depends_on_id: str
    dependency_type: DependencyType = DependencyType.FINISH_TO_START
    lag_time: int = Field(0, ge=0, description="Lag time in hours")


class DependencyValidation(BaseModel):
    """Dependency validation result"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    can_start: bool
    blocking_tasks: List[Dict[str, Any]] = []


class CriticalPathResult(BaseModel):
    """Critical path calculation result"""
    critical_path: List[str]  # List of task IDs
    total_duration: int  # In days
    critical_tasks: List[Dict[str, Any]]
    all_tasks_slack: Dict[str, int]


# Workflow Models

class WorkflowStep(BaseModel):
    """Workflow step definition"""
    id: str
    template_id: str
    name: str
    description: str = ""
    order: int
    action_type: ActionType
    action_config: Dict[str, Any] = {}
    conditions: List[Dict[str, Any]] = []
    created_at: datetime


class WorkflowTemplate(BaseModel):
    """Workflow template"""
    id: str
    name: str
    description: str
    board_id: str
    is_active: bool = True
    triggers: List[str] = []  # e.g., ["task_completed", "task_moved", "custom_field_changed"]
    steps: List[WorkflowStep] = []
    created_at: datetime
    updated_at: datetime


class CreateWorkflowRequest(BaseModel):
    """Request to create a workflow template"""
    name: str
    description: str
    board_id: str
    steps: List[Dict[str, Any]]
    triggers: List[str] = []


class UpdateWorkflowRequest(BaseModel):
    """Request to update a workflow template"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    triggers: Optional[List[str]] = None


class WorkflowInstance(BaseModel):
    """Workflow instance (execution)"""
    id: str
    template_id: str
    trigger_task_id: Optional[str] = None
    triggered_by: str  # User ID
    status: WorkflowStatus
    variables: Dict[str, Any] = {}
    context: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class StepExecution(BaseModel):
    """Workflow step execution record"""
    id: str
    instance_id: str
    step_id: str
    step_name: str
    status: StepStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class TriggerWorkflowRequest(BaseModel):
    """Request to trigger a workflow"""
    template_id: str
    trigger_task_id: str
    variables: Dict[str, Any] = {}


class WorkflowProgress(BaseModel):
    """Workflow execution progress"""
    instance_id: str
    status: WorkflowStatus
    total_steps: int
    completed_steps: int
    progress_percentage: float
    current_step: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


# Analytics Models

class WorkflowAnalytics(BaseModel):
    """Workflow performance analytics"""
    template_id: str
    total_instances: int
    completion_rate: float
    average_duration_hours: float
    status_breakdown: Dict[str, int]
    recent_instances: List[Dict[str, Any]]


class DependencyBottleneck(BaseModel):
    """Dependency bottleneck analysis"""
    task: Dict[str, Any]
    blocking_count: int
    blocked_tasks: List[Dict[str, Any]]
    severity: str  # "high", "medium", "low"


class BottleneckAnalysis(BaseModel):
    """Project bottleneck analysis result"""
    project_id: str
    bottlenecks: List[DependencyBottleneck]
    total_dependencies: int
    high_severity_count: int
    recommendations: List[str]