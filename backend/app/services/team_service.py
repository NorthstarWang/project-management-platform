from typing import Dict, Any, List, Optional
from ..repositories.team_repository import TeamRepository
from ..repositories.user_repository import UserRepository
from ..repositories.notification_repository import NotificationRepository
import uuid
import time

class TeamService:
    """Service for team-related business logic"""
    
    def __init__(self, team_repository: TeamRepository, user_repository: UserRepository, 
                 notification_repository: NotificationRepository):
        self.team_repository = team_repository
        self.user_repository = user_repository
        self.notification_repository = notification_repository
    
    def get_discoverable_teams(self, user_id: str) -> List[Dict[str, Any]]:
        """Get teams that a user can discover"""
        teams = self.team_repository.get_discoverable_teams(user_id)
        
        # Enhance with additional information
        enhanced_teams = []
        for team in teams:
            members = self.team_repository.get_team_members(team["id"])
            managers = [m for m in members if m.get("role") in ["manager", "admin"]]
            
            # Get manager information
            manager_info = []
            for manager in managers:
                user = self.user_repository.find_by_id(manager["user_id"])
                if user:
                    manager_info.append({
                        "id": user["id"],
                        "full_name": user["full_name"],
                        "role": manager["role"]
                    })
            
            enhanced_team = {
                **team,
                "member_count": len(members),
                "managers": manager_info,
                "has_pending_request": self.team_repository.has_pending_join_request(user_id, team["id"]),
                "has_pending_invitation": self.team_repository.has_pending_invitation(user_id, team["id"])
            }
            enhanced_teams.append(enhanced_team)
        
        return enhanced_teams
    
    def request_to_join_team(self, user_id: str, team_id: str, message: Optional[str] = None) -> Dict[str, Any]:
        """Request to join a team"""
        # Validate team exists
        team = self.team_repository.find_by_id(team_id)
        if not team:
            raise ValueError(f"Team with ID '{team_id}' not found")
        
        # Check if user is already a member
        if self.team_repository.is_team_member(user_id, team_id):
            raise ValueError("User is already a member of this team")
        
        # Check if there's already a pending request
        if self.team_repository.has_pending_join_request(user_id, team_id):
            raise ValueError("User already has a pending join request for this team")
        
        # Create join request
        join_request = self.team_repository.create_join_request(user_id, team_id, message)
        
        # Get user info for notification
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Notify team managers
        managers = [m for m in self.team_repository.get_team_members(team_id) 
                   if m.get("role") in ["manager", "admin"]]
        
        for manager in managers:
            self.notification_repository.create({
                "recipient_id": manager["user_id"],
                "type": "team_join_request",
                "title": "New Team Join Request",
                "message": f"{user['full_name']} has requested to join {team['name']}",
                "related_team_id": team_id,
                "related_join_request_id": join_request["id"],
                "read": False
            })
        
        return join_request
    
    def handle_join_request(self, request_id: str, manager_id: str, action: str, 
                          response_message: Optional[str] = None) -> Dict[str, Any]:
        """Handle a team join request (approve/deny)"""
        # Validate request exists
        request = next((req for req in self.team_repository.team_join_requests 
                       if req["id"] == request_id), None)
        if not request:
            raise ValueError(f"Join request with ID '{request_id}' not found")
        
        # Validate manager has permission
        if not self.team_repository.is_team_manager(manager_id, request["team_id"]):
            raise ValueError("Only team managers can handle join requests")
        
        # Validate action
        if action not in ["approve", "deny"]:
            raise ValueError("Action must be 'approve' or 'deny'")
        
        # Update request status
        status = "approved" if action == "approve" else "denied"
        updated_request = self.team_repository.update_join_request(request_id, status, response_message)
        
        # If approved, add user to team
        if action == "approve":
            self.team_repository.add_team_member(request["user_id"], request["team_id"])
        
        # Get team and user info for notification
        team = self.team_repository.find_by_id(request["team_id"])
        user = self.user_repository.find_by_id(request["user_id"])
        manager = self.user_repository.find_by_id(manager_id)
        
        # Notify the requester
        if team and user and manager:
            message = f"Your request to join {team['name']} has been {status} by {manager['full_name']}"
            if response_message:
                message += f". Message: {response_message}"
                
            self.notification_repository.create({
                "recipient_id": request["user_id"],
                "type": f"team_join_request_{status}",
                "title": f"Team Join Request {status.title()}",
                "message": message,
                "related_team_id": request["team_id"],
                "read": False
            })
        
        return updated_request
    
    def send_team_invitation(self, inviter_id: str, user_id: str, team_id: str, 
                           message: Optional[str] = None) -> Dict[str, Any]:
        """Send a team invitation"""
        # Validate team exists and inviter has permission
        team = self.team_repository.find_by_id(team_id)
        if not team:
            raise ValueError(f"Team with ID '{team_id}' not found")
        
        if not self.team_repository.is_team_manager(inviter_id, team_id):
            raise ValueError("Only team managers can send invitations")
        
        # Validate target user exists
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Check if user is already a member
        if self.team_repository.is_team_member(user_id, team_id):
            raise ValueError("User is already a member of this team")
        
        # Check if there's already a pending invitation
        if self.team_repository.has_pending_invitation(user_id, team_id):
            raise ValueError("User already has a pending invitation for this team")
        
        # Create invitation
        invitation = self.team_repository.create_invitation(inviter_id, user_id, team_id, message)
        
        # Get inviter info for notification
        inviter = self.user_repository.find_by_id(inviter_id)
        if not inviter:
            raise ValueError(f"Inviter with ID '{inviter_id}' not found")
        
        # Notify the user
        notification_message = f"{inviter['full_name']} has invited you to join {team['name']}"
        if message:
            notification_message += f". Message: {message}"
            
        self.notification_repository.create({
            "recipient_id": user_id,
            "type": "team_invitation",
            "title": "Team Invitation",
            "message": notification_message,
            "related_team_id": team_id,
            "related_invitation_id": invitation["id"],
            "read": False
        })
        
        return invitation
    
    def handle_team_invitation(self, invitation_id: str, user_id: str, action: str, 
                             response_message: Optional[str] = None) -> Dict[str, Any]:
        """Handle a team invitation (accept/decline)"""
        # Validate invitation exists
        invitation = next((inv for inv in self.team_repository.team_invitations 
                          if inv["id"] == invitation_id), None)
        if not invitation:
            raise ValueError(f"Invitation with ID '{invitation_id}' not found")
        
        # Validate user is the recipient
        if invitation["user_id"] != user_id:
            raise ValueError("User can only respond to their own invitations")
        
        # Validate action
        if action not in ["accept", "decline"]:
            raise ValueError("Action must be 'accept' or 'decline'")
        
        # Update invitation status
        status = "accepted" if action == "accept" else "declined"
        updated_invitation = self.team_repository.update_invitation(invitation_id, status, response_message)
        
        # If accepted, add user to team
        if action == "accept":
            self.team_repository.add_team_member(user_id, invitation["team_id"])
        
        # Get team and user info for notification
        team = self.team_repository.find_by_id(invitation["team_id"])
        user = self.user_repository.find_by_id(user_id)
        inviter = self.user_repository.find_by_id(invitation["inviter_id"])
        
        # Notify the inviter
        if team and user and inviter:
            message = f"{user['full_name']} has {status} your invitation to join {team['name']}"
            if response_message:
                message += f". Message: {response_message}"
                
            self.notification_repository.create({
                "recipient_id": invitation["inviter_id"],
                "type": f"team_invitation_{status}",
                "title": f"Team Invitation {status.title()}",
                "message": message,
                "related_team_id": invitation["team_id"],
                "read": False
            })
        
        return updated_invitation
    
    def get_user_team_requests(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's team join requests"""
        requests = self.team_repository.get_user_join_requests(user_id)
        
        # Enhance with team information
        enhanced_requests = []
        for request in requests:
            team = self.team_repository.find_by_id(request["team_id"])
            if team:
                enhanced_requests.append({
                    **request,
                    "team": team
                })
        
        return enhanced_requests
    
    def get_user_team_invitations(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's team invitations"""
        invitations = self.team_repository.get_user_invitations(user_id, "pending")
        
        # Enhance with team and inviter information
        enhanced_invitations = []
        for invitation in invitations:
            team = self.team_repository.find_by_id(invitation["team_id"])
            inviter = self.user_repository.find_by_id(invitation["inviter_id"])
            if team and inviter:
                enhanced_invitations.append({
                    **invitation,
                    "team": team,
                    "inviter": {
                        "id": inviter["id"],
                        "full_name": inviter["full_name"]
                    }
                })
        
        return enhanced_invitations
    
    def get_team_join_requests_for_manager(self, manager_id: str, team_id: str) -> List[Dict[str, Any]]:
        """Get team join requests for a manager"""
        # Validate manager has permission
        if not self.team_repository.is_team_manager(manager_id, team_id):
            raise ValueError("Only team managers can view join requests")
        
        requests = self.team_repository.get_team_join_requests(team_id, "pending")
        
        # Enhance with user information
        enhanced_requests = []
        for request in requests:
            user = self.user_repository.find_by_id(request["user_id"])
            if user:
                enhanced_requests.append({
                    **request,
                    "user": {
                        "id": user["id"],
                        "full_name": user["full_name"],
                        "email": user["email"]
                    }
                })
        
        return enhanced_requests
    
    def create_team_creation_request(self, user_id: str, team_name: str, team_description: str, 
                                   message: Optional[str] = None) -> Dict[str, Any]:
        """Create a team creation request"""
        # Validate user exists
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Check if user is admin (admins don't need to request)
        if user.get("role") == "admin":
            raise ValueError("Admins can create teams directly without requests")
        
        # Check if team name already exists
        existing_team = self.team_repository.find_by_name(team_name)
        if existing_team:
            raise ValueError(f"Team with name '{team_name}' already exists")
        
        # Check if user already has a pending request for this team name
        from ..data_manager import data_manager
        existing_request = next((req for req in data_manager.team_creation_requests 
                               if req["requester_id"] == user_id and 
                                  req["team_name"] == team_name and 
                                  req["status"] == "pending"), None)
        if existing_request:
            raise ValueError(f"User already has a pending request for team '{team_name}'")
        
        # Create the request
        request_id = str(uuid.uuid4())
        creation_request = {
            "id": request_id,
            "requester_id": user_id,
            "team_name": team_name,
            "team_description": team_description,
            "message": message,
            "status": "pending",
            "created_at": time.time(),
            "reviewed_at": None,
            "reviewed_by": None,
            "response_message": None
        }
        
        data_manager.team_creation_requests.append(creation_request)
        
        # Notify all admins
        admins = [u for u in self.user_repository.find_all() if u.get("role") == "admin"]
        for admin in admins:
            self.notification_repository.create({
                "recipient_id": admin["id"],
                "type": "team_creation_request",
                "title": "New Team Creation Request",
                "message": f"{user['full_name']} has requested to create team '{team_name}'",
                "related_team_creation_request_id": request_id,
                "read": False
            })
        
        return creation_request
    
    def get_team_creation_requests(self, admin_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get team creation requests for admin review"""
        # Validate admin permission
        admin = self.user_repository.find_by_id(admin_id)
        if not admin or admin.get("role") != "admin":
            raise ValueError("Only admins can view team creation requests")
        
        from ..data_manager import data_manager
        requests = data_manager.team_creation_requests.copy()
        
        # Filter by status if provided
        if status:
            requests = [req for req in requests if req["status"] == status]
        
        # Sort by creation time (newest first)
        requests.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Enhance with requester information
        enhanced_requests = []
        for request in requests:
            requester = self.user_repository.find_by_id(request["requester_id"])
            if requester:
                enhanced_request = {
                    **request,
                    "requester": {
                        "id": requester["id"],
                        "full_name": requester["full_name"],
                        "email": requester["email"],
                        "username": requester["username"]
                    }
                }
                
                # Add reviewer info if reviewed
                if request.get("reviewed_by"):
                    reviewer = self.user_repository.find_by_id(request["reviewed_by"])
                    if reviewer:
                        enhanced_request["reviewer"] = {
                            "id": reviewer["id"],
                            "full_name": reviewer["full_name"]
                        }
                
                enhanced_requests.append(enhanced_request)
        
        return enhanced_requests
    
    def handle_team_creation_request(self, request_id: str, admin_id: str, action: str, 
                                   assigned_manager_id: Optional[str] = None, 
                                   response_message: Optional[str] = None) -> Dict[str, Any]:
        """Handle a team creation request (approve/deny)"""
        # Validate admin permission
        admin = self.user_repository.find_by_id(admin_id)
        if not admin or admin.get("role") != "admin":
            raise ValueError("Only admins can handle team creation requests")
        
        # Validate action
        if action not in ["approve", "deny"]:
            raise ValueError("Action must be 'approve' or 'deny'")
        
        # Find the request
        from ..data_manager import data_manager
        request = next((req for req in data_manager.team_creation_requests 
                       if req["id"] == request_id), None)
        if not request:
            raise ValueError(f"Team creation request with ID '{request_id}' not found")
        
        if request["status"] != "pending":
            raise ValueError("Request has already been reviewed")
        
        # If approving, validate assigned manager
        if action == "approve":
            if not assigned_manager_id:
                # Default to the requester as manager
                assigned_manager_id = request["requester_id"]
            
            manager = self.user_repository.find_by_id(assigned_manager_id)
            if not manager:
                raise ValueError(f"Assigned manager with ID '{assigned_manager_id}' not found")
            
            # Check if team name is still available
            existing_team = self.team_repository.find_by_name(request["team_name"])
            if existing_team:
                raise ValueError(f"Team with name '{request['team_name']}' already exists")
        
        # Update request status
        request["status"] = "approved" if action == "approve" else "denied"
        request["reviewed_at"] = time.time()
        request["reviewed_by"] = admin_id
        request["response_message"] = response_message
        
        # If approved, create the team and assign manager
        created_team = None
        if action == "approve":
            # Create the team
            team_id = str(uuid.uuid4())
            created_team = {
                "id": team_id,
                "name": request["team_name"],
                "description": request["team_description"],
                "created_at": time.time(),
                "created_by": admin_id
            }
            data_manager.teams.append(created_team)
            
            # Add manager membership
            self.team_repository.add_team_member(assigned_manager_id, team_id, "manager")
            
            # Add admin membership
            self.team_repository.add_team_member(admin_id, team_id, "admin")
        
        # Notify the requester
        requester = self.user_repository.find_by_id(request["requester_id"])
        if requester:
            if action == "approve":
                message = f"Your request to create team '{request['team_name']}' has been approved!"
                if assigned_manager_id != request["requester_id"]:
                    assigned_manager = self.user_repository.find_by_id(assigned_manager_id)
                    if assigned_manager:
                        message += f" {assigned_manager['full_name']} has been assigned as the manager."
                else:
                    message += " You have been assigned as the manager."
            else:
                message = f"Your request to create team '{request['team_name']}' has been denied."
            
            if response_message:
                message += f" Admin message: {response_message}"
            
            self.notification_repository.create({
                "recipient_id": request["requester_id"],
                "type": f"team_creation_request_{request['status']}",
                "title": f"Team Creation Request {request['status'].title()}",
                "message": message,
                "related_team_id": created_team["id"] if created_team else None,
                "read": False
            })
        
        return {
            "request": request,
            "team": created_team
        }
    
    def quit_team_as_manager(self, manager_id: str, team_id: str, 
                           new_manager_id: Optional[str] = None, 
                           message: Optional[str] = None) -> Dict[str, Any]:
        """Handle manager quitting a team with optional reassignment"""
        # Validate manager permission
        if not self.team_repository.is_team_manager(manager_id, team_id):
            raise ValueError("Only team managers can quit teams")
        
        team = self.team_repository.find_by_id(team_id)
        if not team:
            raise ValueError(f"Team with ID '{team_id}' not found")
        
        # Get team members
        members = self.team_repository.get_team_members(team_id)
        non_admin_members = [m for m in members if m.get("role") == "member"]
        
        if new_manager_id:
            # Reassign manager
            new_manager = self.user_repository.find_by_id(new_manager_id)
            if not new_manager:
                raise ValueError(f"New manager with ID '{new_manager_id}' not found")
            
            # Check if new manager is a team member
            if not any(m["user_id"] == new_manager_id for m in members):
                raise ValueError("New manager must be a team member")
            
            # Update roles
            self.team_repository.update_member_role(new_manager_id, team_id, "manager")
            self.team_repository.remove_team_member(manager_id, team_id)
            
            # Notify new manager
            self.notification_repository.create({
                "recipient_id": new_manager_id,
                "type": "manager_assigned",
                "title": "You've been promoted to Team Manager",
                "message": f"You are now the manager of team '{team['name']}'",
                "related_team_id": team_id,
                "read": False
            })
            
            # Notify other team members
            for member in members:
                if member["user_id"] not in [manager_id, new_manager_id]:
                    self.notification_repository.create({
                        "recipient_id": member["user_id"],
                        "type": "manager_changed",
                        "title": "Team Manager Changed",
                        "message": f"{new_manager['full_name']} is now the manager of team '{team['name']}'",
                        "related_team_id": team_id,
                        "read": False
                    })
            
            return {
                "action": "reassigned",
                "new_manager": new_manager,
                "team": team
            }
        else:
            # Disband team - remove all members and projects
            # First, notify all members
            for member in members:
                if member["user_id"] != manager_id:
                    self.notification_repository.create({
                        "recipient_id": member["user_id"],
                        "type": "team_disbanded",
                        "title": "Team Disbanded",
                        "message": f"Team '{team['name']}' has been disbanded by the manager",
                        "read": False
                    })
            
            # Remove all team memberships
            from ..data_manager import data_manager
            data_manager.team_memberships = [
                m for m in data_manager.team_memberships 
                if m["team_id"] != team_id
            ]
            
            # Archive team projects (don't delete, just mark as archived)
            for project in data_manager.projects:
                if project.get("team_id") == team_id:
                    project["archived"] = True
                    project["archived_at"] = time.time()
                    project["archived_by"] = manager_id
            
            return {
                "action": "disbanded",
                "team": team
            } 