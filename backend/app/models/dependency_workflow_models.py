"""
Dependency & Workflow Management System Models

This module contains all Pydantic models for the advanced dependency and workflow
management system, including task dependencies, recurring tasks, workflow state
machines, automation rules, and template management.
"""

from datetime import datetime, date, time
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
import uuid


# Enums for Dependency & Workflow System

class DependencyType(str, Enum):
    """Types of dependencies between tasks"""
    BLOCKS = "blocks"  # Current task must complete before dependent task
    BLOCKED_BY = "blocked_by"  # Current task cannot start until dependency completes
    RELATES_TO = "relates_to"  # Reference relationship
    DUPLICATES = "duplicates"  # Same task
    PARENT_CHILD = "parent_child"  # Hierarchical relationship
    CAUSED_BY = "caused_by"  # Root cause relationship
    RESOLVES = "resolves"  # Fixes/resolves another task


class RecurrenceFrequency(str, Enum):
    """Frequency of recurring tasks"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class WeekDay(str, Enum):
    """Days of the week for recurring patterns"""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class MonthlyRecurrenceType(str, Enum):
    """Types of monthly recurrence"""
    DATE = "date"  # Specific date of month (e.g., 15th)
    DAY = "day"  # Specific day pattern (e.g., 2nd Tuesday)


class WorkflowStateType(str, Enum):
    """Types of workflow states"""
    INITIAL = "initial"
    NORMAL = "normal"
    APPROVAL = "approval"
    PARALLEL = "parallel"
    FINAL = "final"


class TransitionConditionOperator(str, Enum):
    """Operators for transition conditions"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    IN = "in"
    NOT_IN = "not_in"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"


class AutomationTriggerType(str, Enum):
    """Types of automation triggers"""
    TASK_CREATED = "task_created"
    STATUS_CHANGED = "status_changed"
    FIELD_UPDATED = "field_updated"
    DUE_DATE_APPROACHING = "due_date_approaching"
    COMMENT_ADDED = "comment_added"
    USER_ASSIGNED = "user_assigned"
    USER_UNASSIGNED = "user_unassigned"
    TIME_LOGGED = "time_logged"
    SPRINT_STARTED = "sprint_started"
    SPRINT_ENDED = "sprint_ended"
    DEPENDENCY_COMPLETED = "dependency_completed"
    SCHEDULE_BASED = "schedule_based"
    MANUAL = "manual"


class AutomationActionType(str, Enum):
    """Types of automation actions"""
    UPDATE_FIELD = "update_field"
    CHANGE_STATUS = "change_status"
    ASSIGN_USER = "assign_user"
    UNASSIGN_USER = "unassign_user"
    CREATE_TASK = "create_task"
    CREATE_SUBTASK = "create_subtask"
    SEND_NOTIFICATION = "send_notification"
    ADD_COMMENT = "add_comment"
    START_TIMER = "start_timer"
    STOP_TIMER = "stop_timer"
    UPDATE_DEPENDENCY = "update_dependency"
    CALCULATE_FIELD = "calculate_field"
    GENERATE_REPORT = "generate_report"
    SEND_EMAIL = "send_email"
    WEBHOOK = "webhook"
    RUN_AUTOMATION = "run_automation"


class TemplateType(str, Enum):
    """Types of templates"""
    PROJECT = "project"
    TASK = "task"
    WORKFLOW = "workflow"
    CHECKLIST = "checklist"
    FORM = "form"
    REPORT = "report"
    AUTOMATION = "automation"


class CriticalPathStatus(str, Enum):
    """Status of tasks in critical path"""
    ON_CRITICAL_PATH = "on_critical_path"
    HAS_SLACK = "has_slack"
    NOT_ANALYZED = "not_analyzed"


# Dependency Models

class TaskDependency(BaseModel):
    """Represents a dependency between two tasks"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_task_id: str
    target_task_id: str
    dependency_type: DependencyType
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    lag_days: int = 0  # Number of days between tasks
    notes: Optional[str] = None
    is_active: bool = True
    
    @validator('lag_days')
    def validate_lag_days(cls, v):
        if v < -365 or v > 365:
            raise ValueError("Lag days must be between -365 and 365")
        return v


class DependencyChain(BaseModel):
    """Represents a chain of dependent tasks"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    chain_name: str
    task_ids: List[str]  # Ordered list of task IDs in the chain
    total_duration_days: Optional[int] = None
    critical_path: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DependencyGraph(BaseModel):
    """Represents the dependency graph for a project"""
    project_id: str
    nodes: List[Dict[str, Any]]  # Task nodes with properties
    edges: List[Dict[str, Any]]  # Dependencies as edges
    critical_paths: List[List[str]]  # Lists of task IDs forming critical paths
    has_cycles: bool = False
    cycle_details: Optional[List[List[str]]] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    stats: Dict[str, Any] = Field(default_factory=dict)


class CriticalPathAnalysis(BaseModel):
    """Critical path analysis results"""
    project_id: str
    critical_tasks: List[str]
    project_duration_days: int
    slack_by_task: Dict[str, int]  # Task ID -> slack days
    earliest_start_dates: Dict[str, datetime]
    latest_start_dates: Dict[str, datetime]
    earliest_finish_dates: Dict[str, datetime]
    latest_finish_dates: Dict[str, datetime]
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


# Recurring Task Models

class RecurrencePattern(BaseModel):
    """Defines a recurrence pattern for tasks"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    frequency: RecurrenceFrequency
    interval: int = 1  # Every N days/weeks/months
    
    # Daily options
    business_days_only: bool = False
    
    # Weekly options
    week_days: Optional[List[WeekDay]] = None
    
    # Monthly options
    monthly_type: Optional[MonthlyRecurrenceType] = None
    month_day: Optional[int] = None  # 1-31 for specific date
    month_week: Optional[int] = None  # 1-5 for week number
    month_weekday: Optional[WeekDay] = None  # For "2nd Tuesday" pattern
    
    # Yearly options
    yearly_month: Optional[int] = None  # 1-12
    yearly_day: Optional[int] = None  # 1-31
    
    # End conditions
    end_type: str = "never"  # "never", "date", "count"
    end_date: Optional[date] = None
    end_count: Optional[int] = None
    
    # Exclusions
    exclude_holidays: bool = False
    excluded_dates: List[date] = Field(default_factory=list)
    
    # Time settings
    preferred_time: Optional[time] = None
    timezone: str = "UTC"
    
    @validator('interval')
    def validate_interval(cls, v):
        if v < 1 or v > 100:
            raise ValueError("Interval must be between 1 and 100")
        return v


class RecurringTask(BaseModel):
    """Represents a recurring task template"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template_task_id: str  # Base task to copy
    project_id: str
    board_id: str
    list_id: str
    recurrence_pattern_id: str
    
    # Template values
    title_template: str
    description_template: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: str = "medium"
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # Instance tracking
    created_instances: List[str] = Field(default_factory=list)
    next_occurrence: Optional[datetime] = None
    last_created: Optional[datetime] = None
    
    # Settings
    is_active: bool = True
    auto_create_days_ahead: int = 7  # Create instances N days in advance
    skip_weekends: bool = False
    adjust_due_date: bool = True  # Adjust due date based on creation date
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RecurringException(BaseModel):
    """Exception for a specific recurring task instance"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recurring_task_id: str
    exception_date: date
    action: str  # "skip", "reschedule", "modify"
    reschedule_to: Optional[date] = None
    modifications: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


# Workflow Models

class WorkflowState(BaseModel):
    """Represents a state in a workflow"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    name: str
    display_name: str
    state_type: WorkflowStateType
    color: str = "#6B7280"
    icon: Optional[str] = None
    description: Optional[str] = None
    
    # State properties
    is_initial: bool = False
    is_final: bool = False
    is_active: bool = True
    allow_comments: bool = True
    allow_attachments: bool = True
    
    # Required fields when entering state
    required_fields: List[str] = Field(default_factory=list)
    required_approvals: int = 0
    approval_users: List[str] = Field(default_factory=list)
    approval_roles: List[str] = Field(default_factory=list)
    
    # Automation
    entry_actions: List[str] = Field(default_factory=list)  # Automation rule IDs
    exit_actions: List[str] = Field(default_factory=list)
    
    # SLA
    sla_hours: Optional[int] = None
    escalation_user_id: Optional[str] = None
    
    position: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TransitionCondition(BaseModel):
    """Condition for a workflow transition"""
    field_name: str
    operator: TransitionConditionOperator
    value: Any
    is_custom_field: bool = False


class WorkflowTransition(BaseModel):
    """Represents a transition between workflow states"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    from_state_id: str
    to_state_id: str
    name: str
    
    # Conditions
    conditions: List[TransitionCondition] = Field(default_factory=list)
    condition_logic: str = "AND"  # "AND" or "OR"
    
    # Permissions
    allowed_users: List[str] = Field(default_factory=list)
    allowed_roles: List[str] = Field(default_factory=list)
    allow_all: bool = True
    
    # Actions
    automation_rules: List[str] = Field(default_factory=list)
    update_fields: Dict[str, Any] = Field(default_factory=dict)
    
    # UI
    button_label: Optional[str] = None
    confirmation_required: bool = False
    confirmation_message: Optional[str] = None
    comment_required: bool = False
    
    priority: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowDefinition(BaseModel):
    """Complete workflow definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    entity_type: str  # "task", "project", "board"
    
    # States and transitions defined separately
    version: int = 1
    is_active: bool = True
    is_default: bool = False
    
    # Settings
    allow_parallel_states: bool = False
    track_time_in_states: bool = True
    enforce_transitions: bool = True
    
    # Usage
    project_ids: List[str] = Field(default_factory=list)
    board_ids: List[str] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None


class WorkflowInstance(BaseModel):
    """Instance of a workflow for a specific entity"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    entity_type: str
    entity_id: str
    current_state_id: str
    previous_state_id: Optional[str] = None
    
    # Parallel states support
    active_states: List[str] = Field(default_factory=list)
    
    # History
    state_history: List[Dict[str, Any]] = Field(default_factory=list)
    transition_history: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Metrics
    time_in_states: Dict[str, int] = Field(default_factory=dict)  # State ID -> minutes
    total_transitions: int = 0
    
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    is_completed: bool = False


# Automation Models

class AutomationTrigger(BaseModel):
    """Trigger configuration for automation rules"""
    trigger_type: AutomationTriggerType
    
    # Field-based triggers
    field_name: Optional[str] = None
    field_old_value: Optional[Any] = None
    field_new_value: Optional[Any] = None
    
    # Status triggers
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    
    # Time-based triggers
    schedule_cron: Optional[str] = None
    days_before_due: Optional[int] = None
    hours_after_created: Optional[int] = None
    
    # User triggers
    assigned_user_id: Optional[str] = None
    assigned_user_role: Optional[str] = None
    
    # Additional filters
    project_ids: List[str] = Field(default_factory=list)
    board_ids: List[str] = Field(default_factory=list)
    tag_filters: List[str] = Field(default_factory=list)
    priority_filters: List[str] = Field(default_factory=list)


class AutomationAction(BaseModel):
    """Action configuration for automation rules"""
    action_type: AutomationActionType
    
    # Field updates
    field_name: Optional[str] = None
    field_value: Optional[Any] = None
    
    # Status updates
    new_status: Optional[str] = None
    
    # User assignments
    assign_to_user_id: Optional[str] = None
    assign_to_role: Optional[str] = None
    assign_to_field: Optional[str] = None  # Get user from field
    
    # Task creation
    task_template_id: Optional[str] = None
    task_title: Optional[str] = None
    task_description: Optional[str] = None
    task_list_id: Optional[str] = None
    
    # Notifications
    notification_template: Optional[str] = None
    notification_users: List[str] = Field(default_factory=list)
    
    # Comments
    comment_template: Optional[str] = None
    
    # Calculations
    calculation_formula: Optional[str] = None
    
    # Webhooks
    webhook_url: Optional[str] = None
    webhook_payload: Optional[Dict[str, Any]] = None
    
    # Chained automations
    next_automation_id: Optional[str] = None
    
    delay_minutes: int = 0  # Delay before executing action


class AutomationRule(BaseModel):
    """Complete automation rule definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    
    # Trigger and actions
    triggers: List[AutomationTrigger]
    trigger_logic: str = "OR"  # "AND" or "OR" for multiple triggers
    conditions: List[TransitionCondition] = Field(default_factory=list)
    condition_logic: str = "AND"
    actions: List[AutomationAction]
    
    # Scope
    project_ids: List[str] = Field(default_factory=list)
    board_ids: List[str] = Field(default_factory=list)
    applies_to_subtasks: bool = False
    
    # Settings
    is_active: bool = True
    stop_on_error: bool = True
    max_executions_per_day: Optional[int] = None
    last_execution: Optional[datetime] = None
    execution_count: int = 0
    
    # Testing
    is_test_mode: bool = False
    test_results: List[Dict[str, Any]] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AutomationLog(BaseModel):
    """Log entry for automation execution"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rule_id: str
    rule_name: str
    trigger_type: AutomationTriggerType
    entity_type: str
    entity_id: str
    
    # Execution details
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Results
    status: str  # "pending", "running", "success", "failed", "skipped"
    actions_executed: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    
    # Changes made
    changes: List[Dict[str, Any]] = Field(default_factory=list)
    affected_entities: List[Dict[str, str]] = Field(default_factory=list)
    
    # Context
    trigger_data: Dict[str, Any] = Field(default_factory=dict)
    execution_context: Dict[str, Any] = Field(default_factory=dict)


# Template Models

class TemplateVariable(BaseModel):
    """Variable definition for templates"""
    name: str
    display_name: str
    variable_type: str  # "text", "number", "date", "user", "list"
    default_value: Optional[Any] = None
    required: bool = False
    description: Optional[str] = None
    options: List[Any] = Field(default_factory=list)  # For list types
    validation_pattern: Optional[str] = None


class TemplateDefinition(BaseModel):
    """Template definition for various entities"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    template_type: TemplateType
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    
    # Template content
    content: Dict[str, Any]  # JSON structure of the template
    variables: List[TemplateVariable] = Field(default_factory=list)
    
    # Settings
    is_public: bool = False
    is_active: bool = True
    requires_approval: bool = False
    approved_by: Optional[str] = None
    
    # Usage tracking
    usage_count: int = 0
    last_used: Optional[datetime] = None
    rating: Optional[float] = None
    reviews: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Versioning
    version: int = 1
    parent_template_id: Optional[str] = None
    
    # Sharing
    shared_with_teams: List[str] = Field(default_factory=list)
    shared_with_users: List[str] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None


class TemplateUsage(BaseModel):
    """Record of template usage"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template_id: str
    template_version: int
    used_by: str
    used_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Variable values used
    variable_values: Dict[str, Any] = Field(default_factory=dict)
    
    # Created entities
    created_entity_type: str
    created_entity_id: str
    
    # Feedback
    was_helpful: Optional[bool] = None
    feedback_comment: Optional[str] = None
    modifications_made: bool = False


# Request/Response Models

class CreateDependencyRequest(BaseModel):
    """Request to create a task dependency"""
    source_task_id: str
    target_task_id: str
    dependency_type: DependencyType
    lag_days: int = 0
    notes: Optional[str] = None


class CreateRecurringTaskRequest(BaseModel):
    """Request to create a recurring task"""
    template_task_id: str
    project_id: str
    board_id: str
    list_id: str
    recurrence_pattern: RecurrencePattern
    title_template: str
    description_template: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: str = "medium"
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    auto_create_days_ahead: int = 7
    skip_weekends: bool = False
    adjust_due_date: bool = True


class CreateWorkflowRequest(BaseModel):
    """Request to create a workflow"""
    name: str
    description: Optional[str] = None
    entity_type: str
    states: List[WorkflowState]
    transitions: List[WorkflowTransition]
    allow_parallel_states: bool = False
    track_time_in_states: bool = True
    enforce_transitions: bool = True


class CreateAutomationRequest(BaseModel):
    """Request to create an automation rule"""
    name: str
    description: Optional[str] = None
    triggers: List[AutomationTrigger]
    trigger_logic: str = "OR"
    conditions: List[TransitionCondition] = Field(default_factory=list)
    condition_logic: str = "AND"
    actions: List[AutomationAction]
    project_ids: List[str] = Field(default_factory=list)
    board_ids: List[str] = Field(default_factory=list)
    applies_to_subtasks: bool = False
    max_executions_per_day: Optional[int] = None


class CreateTemplateRequest(BaseModel):
    """Request to create a template"""
    name: str
    description: Optional[str] = None
    template_type: TemplateType
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    content: Dict[str, Any]
    variables: List[TemplateVariable] = Field(default_factory=list)
    is_public: bool = False


class ApplyTemplateRequest(BaseModel):
    """Request to apply a template"""
    template_id: str
    variable_values: Dict[str, Any] = Field(default_factory=dict)
    target_project_id: Optional[str] = None
    target_board_id: Optional[str] = None
    target_list_id: Optional[str] = None


class TestAutomationRequest(BaseModel):
    """Request to test an automation rule"""
    entity_type: str
    entity_id: str
    trigger_data: Dict[str, Any] = Field(default_factory=dict)
    dry_run: bool = True


class PreviewRecurrenceRequest(BaseModel):
    """Request to preview recurring task instances"""
    recurrence_pattern: RecurrencePattern
    start_date: date
    preview_count: int = 10


class WorkflowTransitionRequest(BaseModel):
    """Request to transition workflow state"""
    entity_type: str
    entity_id: str
    to_state_id: str
    comment: Optional[str] = None
    field_updates: Dict[str, Any] = Field(default_factory=dict)


class DependencyAnalysisRequest(BaseModel):
    """Request for dependency analysis"""
    project_id: str
    include_cross_project: bool = False
    analyze_critical_path: bool = True
    include_slack_analysis: bool = True
    max_chain_length: int = 50


# Response Models

class DependencyValidationResult(BaseModel):
    """Result of dependency validation"""
    is_valid: bool
    has_cycles: bool
    cycle_tasks: Optional[List[str]] = None
    warnings: List[str] = Field(default_factory=list)
    impact_analysis: Dict[str, Any] = Field(default_factory=dict)


class RecurrencePreviewResult(BaseModel):
    """Preview of recurring task instances"""
    instances: List[Dict[str, Any]]
    excluded_dates: List[date]
    pattern_description: str
    next_occurrence: Optional[datetime] = None
    end_date: Optional[date] = None
    total_instances: Optional[int] = None


class WorkflowAnalyticsResult(BaseModel):
    """Analytics for workflow performance"""
    workflow_id: str
    period_start: datetime
    period_end: datetime
    
    # State metrics
    average_time_in_states: Dict[str, float]  # State ID -> average minutes
    state_visit_counts: Dict[str, int]
    bottleneck_states: List[str]
    
    # Transition metrics
    transition_counts: Dict[str, int]  # Transition ID -> count
    average_transition_times: Dict[str, float]
    most_used_transitions: List[str]
    
    # Overall metrics
    average_completion_time: float
    completion_rate: float
    abandonment_rate: float
    
    # SLA metrics
    sla_compliance_rate: float
    sla_violations: List[Dict[str, Any]]


class AutomationAnalyticsResult(BaseModel):
    """Analytics for automation rule performance"""
    rule_id: str
    period_start: datetime
    period_end: datetime
    
    # Execution metrics
    total_executions: int
    successful_executions: int
    failed_executions: int
    skipped_executions: int
    
    # Performance metrics
    average_execution_time: float
    max_execution_time: float
    min_execution_time: float
    
    # Impact metrics
    entities_affected: int
    changes_made: int
    most_common_triggers: List[Dict[str, int]]
    most_common_actions: List[Dict[str, int]]
    
    # Error analysis
    error_rate: float
    common_errors: List[Dict[str, Any]]
    
    # Recommendations
    optimization_suggestions: List[str]