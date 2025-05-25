from pydantic import BaseModel
from typing import Optional
 
class CommentIn(BaseModel):
    content: str
    task_id: str
    parent_comment_id: Optional[str] = None  # For threaded replies 