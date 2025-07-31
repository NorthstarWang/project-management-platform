from pydantic import BaseModel
from typing import Optional
from enum import Enum

class NotificationType(str, Enum):
    TASK_ASSIGNED = "task_assigned"
    TASK_UPDATED = "task_updated"
    TASK_COMMENTED = "task_commented"
    TASK_MOVED = "task_moved"
    BOARD_ENROLLED = "board_enrolled"
    PROJECT_ASSIGNED = "project_assigned"
    MESSAGE = "message"

class NotificationIn(BaseModel):
    recipient_id: str
    type: NotificationType
    title: str
    message: str
    related_task_id: Optional[str] = None
    related_board_id: Optional[str] = None
    related_project_id: Optional[str] = None 