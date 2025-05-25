from pydantic import BaseModel
from typing import Optional

class TeamIn(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectIn(BaseModel):
    name: str
    description: Optional[str] = None
    team_id: str

class ProjectAssignmentIn(BaseModel):
    manager_id: str 