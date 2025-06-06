from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..data_manager import data_manager
from ..models.team_models import (
    TeamJoinRequest, TeamJoinRequestResponse, TeamInvitation, TeamInvitationResponse,
    TeamCreationRequest, TeamCreationRequestResponse, TeamQuitRequest
)
from ..models import TeamIn
from .dependencies import get_current_user, log_action

# Additional models for admin operations
class TeamMemberAdd(BaseModel):
    user_id: str
    role: str = "member"

class TeamMemberUpdate(BaseModel):
    role: str

router = APIRouter(prefix="/api", tags=["teams"])

@router.post("/teams")
def create_team(team_in: TeamIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a new team (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create teams directly")
    
    try:
        team = data_manager.project_service.create_team(team_in.name, team_in.description)
        log_action(request, "TEAM_CREATE", {
            "text": f"User {current_user['full_name']} created team {team['name']}",
            "teamId": team["id"],
            "teamName": team["name"],
            "createdBy": current_user["id"]
        })
        return team
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/teams/request-creation")
def request_team_creation(creation_request: TeamCreationRequest, request: Request, 
                         current_user: dict = Depends(get_current_user)):
    """Request team creation (members only)"""
    try:
        result = data_manager.team_service.create_team_creation_request(
            current_user["id"],
            creation_request.name,
            creation_request.description,
            creation_request.message
        )
        
        log_action(request, "TEAM_CREATION_REQUEST", {
            "text": f"User {current_user['full_name']} sent team creation request for team {creation_request.name}",
            "userId": current_user["id"],
            "teamName": creation_request.name,
            "requestId": result["id"]
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams/creation-requests")
def get_team_creation_requests(status: str = None, request: Request = None, 
                              current_user: dict = Depends(get_current_user)):
    """Get team creation requests (admin only)"""
    try:
        requests = data_manager.team_service.get_team_creation_requests(current_user["id"], status)
        
        if request:
            log_action(request, "TEAM_CREATION_REQUESTS_GET", {
                "text": f"User {current_user['full_name']} viewed team creation requests",
                "adminId": current_user["id"],
                "status": status,
                "requestsCount": len(requests)
            })
        
        return requests
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.put("/teams/creation-requests/{request_id}")
def handle_team_creation_request(request_id: str, response: TeamCreationRequestResponse, 
                                request: Request, current_user: dict = Depends(get_current_user)):
    """Handle team creation request (admin only)"""
    try:
        result = data_manager.team_service.handle_team_creation_request(
            request_id,
            current_user["id"],
            response.action,
            response.assigned_manager_id,
            response.message
        )
        
        log_action(request, "TEAM_CREATION_REQUEST_RESPONSE", {
            "text": f"User {current_user['full_name']} responded to team creation request {request_id} with action {response.action}",
            "adminId": current_user["id"],
            "requestId": request_id,
            "action": response.action,
            "assignedManagerId": response.assigned_manager_id
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/teams/{team_id}/quit")
def quit_team(team_id: str, quit_request: TeamQuitRequest, request: Request,
              current_user: dict = Depends(get_current_user)):
    """Quit team as manager with optional reassignment"""
    try:
        result = data_manager.team_service.quit_team_as_manager(
            current_user["id"],
            team_id,
            quit_request.reassignment.new_manager_id,
            quit_request.reassignment.message
        )
        
        log_action(request, "TEAM_QUIT", {
            "text": f"User {current_user['full_name']} quit team {team_id} with action {result['action']}",
            "managerId": current_user["id"],
            "teamId": team_id,
            "action": result["action"],
            "newManagerId": quit_request.reassignment.new_manager_id
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams/discover")
def get_discoverable_teams(request: Request, current_user: dict = Depends(get_current_user)):
    """Get teams that the user can discover and request to join"""
    try:
        teams = data_manager.team_service.get_discoverable_teams(current_user["id"])
        
        log_action(request, "TEAMS_DISCOVER", {
            "text": f"User {current_user['full_name']} viewed discoverable teams",
            "userId": current_user["id"],
            "teamsCount": len(teams)
        })
        
        return teams
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams/{team_id}")
def get_team_details(team_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get team details with members"""
    try:
        # Check if user belongs to team or is admin
        user_teams = data_manager.project_service.get_user_teams(current_user["id"])
        user_team_ids = [team["id"] for team in user_teams]
        
        if team_id not in user_team_ids and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Access denied to this team")
        
        team = next((t for t in data_manager.teams if t["id"] == team_id), None)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get team members using the existing method
        members = data_manager.user_repository.find_by_team(data_manager.team_memberships, team_id)
        
        log_action(request, "TEAM_GET", {
            "text": f"User {current_user['full_name']} viewed team {team['name']}",
            "teamId": team_id, 
            "requestedBy": current_user["id"]
        })
        return {**team, "members": members}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/teams/{team_id}/join-requests")
def request_to_join_team(team_id: str, join_request: TeamJoinRequest, request: Request, 
                        current_user: dict = Depends(get_current_user)):
    """Request to join a team"""
    try:
        # Override team_id from URL
        join_request.team_id = team_id
        
        result = data_manager.team_service.request_to_join_team(
            current_user["id"], 
            join_request.team_id, 
            join_request.message
        )
        
        log_action(request, "TEAM_JOIN_REQUEST", {
            "text": f"User {current_user['full_name']} requested to join team {team_id}",
            "userId": current_user["id"],
            "teamId": team_id,
            "requestId": result["id"]
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams/{team_id}/join-requests")
def get_team_join_requests(team_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get join requests for a team (managers only)"""
    try:
        requests = data_manager.team_service.get_team_join_requests_for_manager(
            current_user["id"], 
            team_id
        )
        
        log_action(request, "TEAM_JOIN_REQUESTS_GET", {
            "text": f"User {current_user['full_name']} viewed join requests for team {team_id}",
            "managerId": current_user["id"],
            "teamId": team_id,
            "requestsCount": len(requests)
        })
        
        return requests
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.put("/teams/join-requests/{request_id}")
def handle_join_request(request_id: str, response: TeamJoinRequestResponse, request: Request,
                       current_user: dict = Depends(get_current_user)):
    """Handle a team join request (approve/deny)"""
    try:
        result = data_manager.team_service.handle_join_request(
            request_id,
            current_user["id"],
            response.action,
            response.message
        )
        
        log_action(request, "TEAM_JOIN_REQUEST_RESPONSE", {
            "text": f"User {current_user['full_name']} responded to join request {request_id} with action {response.action}",
            "managerId": current_user["id"],
            "requestId": request_id,
            "action": response.action
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/teams/{team_id}/invitations")
def send_team_invitation(team_id: str, invitation: TeamInvitation, request: Request,
                        current_user: dict = Depends(get_current_user)):
    """Send a team invitation to a user"""
    try:
        # Override team_id from URL
        invitation.team_id = team_id
        
        result = data_manager.team_service.send_team_invitation(
            current_user["id"],
            invitation.user_id,
            invitation.team_id,
            invitation.message
        )
        
        log_action(request, "TEAM_INVITATION_SEND", {
            "text": f"User {current_user['full_name']} sent team invitation to {invitation.user_id} for team {team_id}",
            "inviterId": current_user["id"],
            "userId": invitation.user_id,
            "teamId": team_id,
            "invitationId": result["id"]
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users/me/team-invitations")
def get_user_team_invitations(request: Request, current_user: dict = Depends(get_current_user)):
    """Get user's pending team invitations"""
    try:
        invitations = data_manager.team_service.get_user_team_invitations(current_user["id"])
        
        log_action(request, "USER_TEAM_INVITATIONS_GET", {
            "text": f"User {current_user['full_name']} viewed team invitations",
            "userId": current_user["id"],
            "invitationsCount": len(invitations)
        })
        
        return invitations
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/team-invitations/{invitation_id}")
def handle_team_invitation(invitation_id: str, response: TeamInvitationResponse, request: Request,
                          current_user: dict = Depends(get_current_user)):
    """Handle a team invitation (accept/decline)"""
    try:
        result = data_manager.team_service.handle_team_invitation(
            invitation_id,
            current_user["id"],
            response.action,
            response.message
        )
        
        log_action(request, "TEAM_INVITATION_RESPONSE", {
            "text": f"User {current_user['full_name']} responded to team invitation {invitation_id} with action {response.action}",
            "userId": current_user["id"],
            "invitationId": invitation_id,
            "action": response.action
        })
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users/me/team-requests")
def get_user_team_requests(request: Request, current_user: dict = Depends(get_current_user)):
    """Get user's team join requests"""
    try:
        requests = data_manager.team_service.get_user_team_requests(current_user["id"])
        
        log_action(request, "USER_TEAM_REQUESTS_GET", {
            "text": f"User {current_user['full_name']} viewed team join requests",
            "userId": current_user["id"],
            "requestsCount": len(requests)
        })
        
        return requests
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams")
def get_user_teams(request: Request, current_user: dict = Depends(get_current_user)):
    """Get teams where user is a member (or all teams for admin)"""
    try:
        # For admins, return all teams
        if current_user["role"] == "admin":
            teams = data_manager.teams
        else:
            teams = data_manager.team_repository.get_user_teams(current_user["id"])
        
        # Enhance with member information and managers
        enhanced_teams = []
        for team in teams:
            members = data_manager.team_repository.get_team_members(team["id"])
            managers = [m for m in members if m["role"] == "manager"]
            
            # Get manager user details
            manager_users = []
            for manager in managers:
                user = data_manager.user_repository.find_by_id(manager["user_id"])
                if user:
                    manager_users.append({
                        "id": user["id"],
                        "full_name": user["full_name"],
                        "role": "manager"
                    })
            
            enhanced_teams.append({
                **team,
                "member_count": len(members),
                "managers": manager_users
            })
        
        log_action(request, "USER_TEAMS_GET", {
            "text": f"User {current_user['full_name']} viewed teams",
            "userId": current_user["id"],
            "isAdmin": current_user["role"] == "admin",
            "teamsCount": len(enhanced_teams)
        })
        
        return enhanced_teams
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users")
def search_users(q: str = "", request: Request = None, current_user: dict = Depends(get_current_user)):
    """Search users for team invitations"""
    try:
        # Get all users
        all_users = data_manager.user_repository.find_all()
        
        # Filter by search query and exclude current user
        filtered_users = []
        for user in all_users:
            if user["id"] != current_user["id"]:
                # Check if search query matches name, username, or email
                if (not q or 
                    q.lower() in user["full_name"].lower() or
                    q.lower() in user["username"].lower() or 
                    q.lower() in user["email"].lower()):
                    filtered_users.append({
                        "id": user["id"],
                        "username": user["username"],
                        "full_name": user["full_name"],
                        "email": user["email"]
                    })
        
        if request:
            log_action(request, "USERS_SEARCH", {
                "text": f"User {current_user['full_name']} searched for users with query {q}",
                "searcherId": current_user["id"],
                "query": q,
                "resultsCount": len(filtered_users)
            })
        
        return filtered_users
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Admin-specific team management endpoints

@router.get("/teams/{team_id}/members")
def get_team_members(team_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get all members of a team with their roles"""
    try:
        # Check if user has access (team member or admin)
        user_teams = data_manager.project_service.get_user_teams(current_user["id"])
        user_team_ids = [team["id"] for team in user_teams]
        
        if team_id not in user_team_ids and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Access denied to this team")
        
        members = data_manager.team_repository.get_team_members(team_id)
        
        # Enhance members with user details
        enhanced_members = []
        for member in members:
            user = data_manager.user_repository.find_by_id(member["user_id"])
            if user:
                enhanced_members.append({
                    **member,
                    "user": {
                        "id": user["id"],
                        "username": user["username"],
                        "full_name": user["full_name"],
                        "email": user["email"],
                        "avatar": user.get("avatar")
                    }
                })
        
        log_action(request, "TEAM_MEMBERS_GET", {
            "text": f"User {current_user['full_name']} viewed team members for team {team_id}",
            "teamId": team_id,
            "requestedBy": current_user["id"],
            "membersCount": len(enhanced_members)
        })
        
        return enhanced_members
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/teams/{team_id}/members")
def add_team_member(team_id: str, member_data: TeamMemberAdd, request: Request, 
                   current_user: dict = Depends(get_current_user)):
    """Add a member to a team (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add members directly")
    
    try:
        # Check if team exists
        team = next((t for t in data_manager.teams if t["id"] == team_id), None)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Check if user exists
        user = data_manager.user_repository.find_by_id(member_data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Add member
        data_manager.team_repository.add_team_member(member_data.user_id, team_id, member_data.role)
        
        # Update user's team_ids
        if team_id not in user.get("team_ids", []):
            user.setdefault("team_ids", []).append(team_id)
        
        log_action(request, "TEAM_MEMBER_ADD", {
            "text": f"User {current_user['full_name']} added {member_data.user_id} to team {team_id} as {member_data.role}",
            "adminId": current_user["id"],
            "teamId": team_id,
            "userId": member_data.user_id,
            "role": member_data.role
        })
        
        return {"message": f"User added to team as {member_data.role}"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/teams/{team_id}/members/{user_id}")
def update_team_member_role(team_id: str, user_id: str, update_data: TeamMemberUpdate, 
                           request: Request, current_user: dict = Depends(get_current_user)):
    """Update a team member's role (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update member roles")
    
    try:
        # Validate role
        if update_data.role not in ["member", "manager"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Find the membership
        membership = next(
            (m for m in data_manager.team_memberships 
             if m["team_id"] == team_id and m["user_id"] == user_id),
            None
        )
        
        if not membership:
            raise HTTPException(status_code=404, detail="Team membership not found")
        
        # Update role
        membership["role"] = update_data.role
        
        log_action(request, "TEAM_MEMBER_ROLE_UPDATE", {
            "text": f"User {current_user['full_name']} updated role of {user_id} in team {team_id} to {update_data.role}",
            "adminId": current_user["id"],
            "teamId": team_id,
            "userId": user_id,
            "newRole": update_data.role
        })
        
        return {"message": f"Role updated to {update_data.role}"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(team_id: str, user_id: str, request: Request, 
                      current_user: dict = Depends(get_current_user)):
    """Remove a member from a team (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can remove members")
    
    try:
        # Remove from team_memberships
        data_manager.team_memberships = [
            m for m in data_manager.team_memberships
            if not (m["team_id"] == team_id and m["user_id"] == user_id)
        ]
        
        # Update user's team_ids
        user = data_manager.user_repository.find_by_id(user_id)
        if user and "team_ids" in user:
            user["team_ids"] = [tid for tid in user["team_ids"] if tid != team_id]
        
        log_action(request, "TEAM_MEMBER_REMOVE", {
            "text": f"User {current_user['full_name']} removed {user_id} from team {team_id}",
            "adminId": current_user["id"],
            "teamId": team_id,
            "userId": user_id
        })
        
        return {"message": "Member removed from team"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/teams/{team_id}")
def disband_team(team_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Disband a team (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can disband teams")
    
    try:
        # Check if team exists
        team = next((t for t in data_manager.teams if t["id"] == team_id), None)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Remove all team memberships
        members = [m for m in data_manager.team_memberships if m["team_id"] == team_id]
        data_manager.team_memberships = [
            m for m in data_manager.team_memberships if m["team_id"] != team_id
        ]
        
        # Update users' team_ids
        for member in members:
            user = data_manager.user_repository.find_by_id(member["user_id"])
            if user and "team_ids" in user:
                user["team_ids"] = [tid for tid in user["team_ids"] if tid != team_id]
        
        # Remove team
        data_manager.teams = [t for t in data_manager.teams if t["id"] != team_id]
        
        # Remove related data
        data_manager.project_assignments = [
            pa for pa in data_manager.project_assignments if pa["team_id"] != team_id
        ]
        
        log_action(request, "TEAM_DISBAND", {
            "text": f"User {current_user['full_name']} disbanded team {team['name']}",
            "adminId": current_user["id"],
            "teamId": team_id,
            "teamName": team["name"],
            "membersRemoved": len(members)
        })
        
        return {"message": "Team disbanded successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users/search")
def search_all_users(q: str = "", request: Request = None, current_user: dict = Depends(get_current_user)):
    """Search all users (for admin functionality)"""
    try:
        # Get all users
        all_users = data_manager.user_repository.find_all()
        
        # Filter by search query
        filtered_users = []
        for user in all_users:
            # Check if search query matches name, username, or email
            if (not q or 
                q.lower() in user["full_name"].lower() or
                q.lower() in user["username"].lower() or 
                q.lower() in user["email"].lower()):
                filtered_users.append({
                    "id": user["id"],
                    "username": user["username"],
                    "full_name": user["full_name"],
                    "email": user["email"],
                    "role": user["role"],
                    "team_ids": user.get("team_ids", [])
                })
        
        if request:
            log_action(request, "USERS_SEARCH", {
                "text": f"User {current_user['full_name']} searched for users with query {q}",
                "searcherId": current_user["id"],
                "query": q,
                "resultsCount": len(filtered_users)
            })
        
        return filtered_users
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) 