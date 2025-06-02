from pydantic import BaseModel
from typing import Optional

class TeamCreateRequest(BaseModel):
    name: str
    description: str

class TeamUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class TeamMembershipCreateRequest(BaseModel):
    user_id: str
    role: str = "member"  # member, manager, admin

class TeamMembershipUpdateRequest(BaseModel):
    role: str

class TeamJoinRequest(BaseModel):
    team_id: str
    message: Optional[str] = None

class TeamJoinRequestResponse(BaseModel):
    action: str  # "approve" or "deny"
    message: Optional[str] = None

class TeamInvitation(BaseModel):
    user_id: str
    team_id: str
    message: Optional[str] = None

class TeamInvitationResponse(BaseModel):
    action: str  # "accept" or "decline"
    message: Optional[str] = None 