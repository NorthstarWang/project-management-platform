from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class ConversationType(str, Enum):
    PRIVATE = "private"
    TEAM = "team"


class MessageIn(BaseModel):
    content: str
    conversation_id: str


class ConversationIn(BaseModel):
    type: ConversationType
    name: Optional[str] = None  # For team conversations
    team_id: Optional[str] = None  # For team conversations
    participant_ids: Optional[List[str]] = None  # For private conversations


class MessageUpdate(BaseModel):
    content: Optional[str] = None
    is_read: Optional[bool] = None
    is_deleted: Optional[bool] = None