from typing import Dict, Any, List, Optional
from .base_repository import BaseRepository
import time

class TeamRepository(BaseRepository):
    """Repository for team-related data operations"""
    
    def __init__(self, teams: List[Dict[str, Any]], team_memberships: List[Dict[str, Any]], 
                 team_join_requests: List[Dict[str, Any]], team_invitations: List[Dict[str, Any]]):
        super().__init__(teams)
        self.team_memberships = team_memberships
        self.team_join_requests = team_join_requests
        self.team_invitations = team_invitations
    
    def find_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find team by name"""
        return next((team for team in self.data_store if team["name"] == name), None)
    
    def get_discoverable_teams(self, exclude_user_id: str) -> List[Dict[str, Any]]:
        """Get teams that a user can discover (teams they're not already in)"""
        # Get teams where user is not already a member
        user_team_ids = {membership["team_id"] for membership in self.team_memberships 
                        if membership["user_id"] == exclude_user_id}
        
        return [team for team in self.data_store if team["id"] not in user_team_ids]
    
    def get_team_members(self, team_id: str) -> List[Dict[str, Any]]:
        """Get all members of a team"""
        return [membership for membership in self.team_memberships 
                if membership["team_id"] == team_id]
    
    def get_user_teams(self, user_id: str) -> List[Dict[str, Any]]:
        """Get teams where user is a member"""
        user_team_ids = {membership["team_id"] for membership in self.team_memberships 
                        if membership["user_id"] == user_id}
        
        return [team for team in self.data_store if team["id"] in user_team_ids]
    
    def is_team_manager(self, user_id: str, team_id: str) -> bool:
        """Check if user is a manager of the team"""
        membership = next((m for m in self.team_memberships 
                          if m["user_id"] == user_id and m["team_id"] == team_id), None)
        return membership and membership.get("role") in ["manager", "admin"]
    
    def is_team_member(self, user_id: str, team_id: str) -> bool:
        """Check if user is a member of the team"""
        return any(m for m in self.team_memberships 
                  if m["user_id"] == user_id and m["team_id"] == team_id)
    
    def update_member_role(self, user_id: str, team_id: str, new_role: str) -> bool:
        """Update a team member's role"""
        membership = next((m for m in self.team_memberships 
                          if m["user_id"] == user_id and m["team_id"] == team_id), None)
        if membership:
            membership["role"] = new_role
            membership["role_updated_at"] = time.time()
            return True
        return False
    
    def remove_team_member(self, user_id: str, team_id: str) -> bool:
        """Remove a member from a team"""
        initial_length = len(self.team_memberships)
        self.team_memberships[:] = [m for m in self.team_memberships 
                                   if not (m["user_id"] == user_id and m["team_id"] == team_id)]
        return len(self.team_memberships) < initial_length
    
    # Join Request methods
    def create_join_request(self, user_id: str, team_id: str, message: Optional[str] = None) -> Dict[str, Any]:
        """Create a team join request"""
        request_data = {
            "user_id": user_id,
            "team_id": team_id,
            "message": message,
            "status": "pending"
        }
        return BaseRepository(self.team_join_requests).create(request_data)
    
    def get_team_join_requests(self, team_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get join requests for a team"""
        requests = [req for req in self.team_join_requests if req["team_id"] == team_id]
        if status:
            requests = [req for req in requests if req["status"] == status]
        return requests
    
    def get_user_join_requests(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get join requests by a user"""
        requests = [req for req in self.team_join_requests if req["user_id"] == user_id]
        if status:
            requests = [req for req in requests if req["status"] == status]
        return requests
    
    def update_join_request(self, request_id: str, status: str, response_message: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update join request status"""
        request = next((req for req in self.team_join_requests if req["id"] == request_id), None)
        if request:
            request["status"] = status
            request["response_message"] = response_message
            request["responded_at"] = time.time()
            return request
        return None
    
    def has_pending_join_request(self, user_id: str, team_id: str) -> bool:
        """Check if user has a pending join request for team"""
        return any(req for req in self.team_join_requests 
                  if req["user_id"] == user_id and req["team_id"] == team_id and req["status"] == "pending")
    
    # Invitation methods
    def create_invitation(self, inviter_id: str, user_id: str, team_id: str, message: Optional[str] = None) -> Dict[str, Any]:
        """Create a team invitation"""
        invitation_data = {
            "inviter_id": inviter_id,
            "user_id": user_id,
            "team_id": team_id,
            "message": message,
            "status": "pending"
        }
        return BaseRepository(self.team_invitations).create(invitation_data)
    
    def get_user_invitations(self, user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get invitations for a user"""
        invitations = [inv for inv in self.team_invitations if inv["user_id"] == user_id]
        if status:
            invitations = [inv for inv in invitations if inv["status"] == status]
        return invitations
    
    def get_team_invitations(self, team_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get invitations for a team"""
        invitations = [inv for inv in self.team_invitations if inv["team_id"] == team_id]
        if status:
            invitations = [inv for inv in invitations if inv["status"] == status]
        return invitations
    
    def update_invitation(self, invitation_id: str, status: str, response_message: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update invitation status"""
        invitation = next((inv for inv in self.team_invitations if inv["id"] == invitation_id), None)
        if invitation:
            invitation["status"] = status
            invitation["response_message"] = response_message
            invitation["responded_at"] = time.time()
            return invitation
        return None
    
    def has_pending_invitation(self, user_id: str, team_id: str) -> bool:
        """Check if user has a pending invitation for team"""
        return any(inv for inv in self.team_invitations 
                  if inv["user_id"] == user_id and inv["team_id"] == team_id and inv["status"] == "pending")
    
    def add_team_member(self, user_id: str, team_id: str, role: str = "member") -> Dict[str, Any]:
        """Add a new team member"""
        membership_data = {
            "user_id": user_id,
            "team_id": team_id,
            "role": role,
            "joined_at": time.time()
        }
        return BaseRepository(self.team_memberships).create(membership_data) 