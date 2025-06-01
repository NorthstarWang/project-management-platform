# Import all models from the modular structure for backward compatibility
from .models import * 

# Add these new models at the end of the file
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