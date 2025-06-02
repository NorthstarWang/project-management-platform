from pydantic import BaseModel
from typing import Optional, List, Dict

class BoardIn(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str
    icon: Optional[str] = "kanban"  # Default icon

class BoardMembershipIn(BaseModel):
    user_id: str

# Add these new models
class BoardStatusIn(BaseModel):
    id: str
    name: str
    color: str
    position: int
    isDeletable: bool
    isCustom: Optional[bool] = False

class BoardStatusesUpdate(BaseModel):
    statuses: List[BoardStatusIn]
    migrationMapping: Optional[Dict[str, str]] = {}

class TaskStatusMigration(BaseModel):
    fromStatusId: str
    toStatusId: str
    taskIds: List[str] 