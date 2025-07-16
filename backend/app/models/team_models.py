from pydantic import BaseModel
from typing import Optional
from enum import Enum

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

# New models for dynamic role system
class TeamCreationRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"

class TeamCreationRequest(BaseModel):
    """Request from a member to create a new team"""
    name: str
    description: str
    message: Optional[str] = None

class TeamCreationRequestResponse(BaseModel):
    """Admin response to team creation request"""
    action: str  # "approve" or "deny"
    assigned_manager_id: Optional[str] = None  # If approved, who should be the manager
    message: Optional[str] = None

class ManagerReassignmentRequest(BaseModel):
    """Request to reassign manager when current manager quits"""
    new_manager_id: Optional[str] = None  # If None, team will be disbanded
    message: Optional[str] = None

class TeamQuitRequest(BaseModel):
    """Request from manager to quit team with reassignment options"""
    reassignment: ManagerReassignmentRequest 