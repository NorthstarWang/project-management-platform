from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from ..models.team_models import TeamJoinRequest, TeamJoinRequestResponse, TeamInvitation, TeamInvitationResponse
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["teams"])

@router.get("/teams/discover")
def get_discoverable_teams(request: Request, current_user: dict = Depends(get_current_user)):
    """Get teams that the user can discover and request to join"""
    try:
        teams = data_manager.team_service.get_discoverable_teams(current_user["id"])
        
        log_action(request, "TEAMS_DISCOVER", {
            "userId": current_user["id"],
            "teamsCount": len(teams)
        })
        
        return teams
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
            "userId": current_user["id"],
            "requestsCount": len(requests)
        })
        
        return requests
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams")
def get_user_teams(request: Request, current_user: dict = Depends(get_current_user)):
    """Get teams where user is a member"""
    try:
        teams = data_manager.team_repository.get_user_teams(current_user["id"])
        
        # Enhance with member information
        enhanced_teams = []
        for team in teams:
            members = data_manager.team_repository.get_team_members(team["id"])
            enhanced_teams.append({
                **team,
                "member_count": len(members)
            })
        
        log_action(request, "USER_TEAMS_GET", {
            "userId": current_user["id"],
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
                "searcherId": current_user["id"],
                "query": q,
                "resultsCount": len(filtered_users)
            })
        
        return filtered_users
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) 