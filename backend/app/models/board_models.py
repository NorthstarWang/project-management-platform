from pydantic import BaseModel
from typing import Optional

class BoardIn(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str

class BoardMembershipIn(BaseModel):
    user_id: str 