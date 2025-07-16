from pydantic import BaseModel
from typing import Optional
from enum import Enum

class TaskStatus(str, Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    ARCHIVED = "archived"
    DELETED = "deleted"

class TaskType(str, Enum):
    FEATURE = "feature"
    BUG = "bug"
    RESEARCH = "research"
    FIX = "fix"
    STORY = "story"
    TASK = "task"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ActivityType(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    MOVED = "moved"
    ASSIGNED = "assigned"
    COMMENTED = "commented"
    STATUS_CHANGED = "status_changed"
    PRIORITY_CHANGED = "priority_changed"
    ARCHIVED = "archived"
    DELETED = "deleted"

# Models for customizable statuses and task types
class CustomStatusIn(BaseModel):
    name: str
    board_id: str
    color: Optional[str] = "#808080"
    position: int

class CustomTaskTypeIn(BaseModel):
    name: str
    board_id: str
    color: Optional[str] = "#808080"
    icon: Optional[str] = None

class ListIn(BaseModel):
    name: str
    board_id: str
    position: Optional[int] = None

class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    list_id: str  # Keep for backward compatibility, will be deprecated
    assignee_id: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[str] = None  # ISO format string
    position: Optional[int] = None
    status: Optional[TaskStatus] = TaskStatus.TODO
    task_type: Optional[TaskType] = TaskType.TASK

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None
    status: Optional[TaskStatus] = None
    task_type: Optional[TaskType] = None
    list_id: Optional[str] = None  # Keep for backward compatibility
    position: Optional[int] = None

class TaskMoveIn(BaseModel):
    list_id: str  # Keep for backward compatibility
    position: Optional[int] = None

class TaskActivityIn(BaseModel):
    task_id: str
    activity_type: ActivityType
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None 