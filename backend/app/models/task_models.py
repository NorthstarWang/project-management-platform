from pydantic import BaseModel
from typing import Optional
from enum import Enum

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    ARCHIVED = "archived"

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

class ListIn(BaseModel):
    name: str
    board_id: str
    position: Optional[int] = None

class TaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    list_id: str
    assignee_id: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[str] = None  # ISO format string
    position: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None
    status: Optional[TaskStatus] = None
    list_id: Optional[str] = None
    position: Optional[int] = None

class TaskMoveIn(BaseModel):
    list_id: str
    position: Optional[int] = None

class TaskActivityIn(BaseModel):
    task_id: str
    activity_type: ActivityType
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None 