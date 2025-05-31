from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from .dependencies import get_current_user, get_current_user_id, log_action

router = APIRouter(prefix="/api", tags=["users"])

@router.get("/users")
def list_users(request: Request, current_user: dict = Depends(get_current_user)):
    """List users (admin/manager only)"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    users = data_manager.user_service.get_all_users()
    log_action(request, "USERS_LIST", {"requestedBy": current_user["id"]})
    return users

@router.get("/users/me")
def get_current_user_info(request: Request, current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    log_action(request, "USER_ME_GET", {"userId": current_user["id"]})
    return current_user

@router.get("/users/me/assigned_tasks")
def get_current_user_assigned_tasks(request: Request, current_user: dict = Depends(get_current_user)):
    """Get tasks assigned to the current user"""
    try:
        tasks = data_manager.task_service.get_user_assigned_tasks(current_user["id"])
        
        # Enhance tasks with assignee names and comment counts
        enhanced_tasks = []
        for task in tasks:
            enhanced_task = task.copy()
            
            # Add assignee name (should be current user)
            enhanced_task["assignee_name"] = current_user["full_name"]
            
            # Add comment count
            comments = data_manager.comment_repository.find_task_comments(task["id"])
            enhanced_task["comments_count"] = len(comments)
            
            # Add attachments count (placeholder for now)
            enhanced_task["attachments_count"] = 0
            
            enhanced_tasks.append(enhanced_task)
        
        log_action(request, "USER_ME_TASKS_GET", {"userId": current_user["id"]})
        return enhanced_tasks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/users/{user_id}/assigned_tasks")
def get_user_assigned_tasks(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get tasks assigned to a specific user"""
    # Users can see their own tasks, admins/managers can see any user's tasks
    if current_user["id"] != user_id and current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        tasks = data_manager.task_service.get_user_assigned_tasks(user_id)
        log_action(request, "USER_TASKS_GET", {"userId": user_id, "requestedBy": current_user["id"]})
        return tasks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/users/me/team-members")
def get_my_team_members(request: Request, current_user: dict = Depends(get_current_user)):
    """Get team members for the current user (managers only)"""
    if current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can view team members")
    
    try:
        # Get teams where the user is a manager
        user_teams = []
        for membership in data_manager.team_memberships:
            if membership["user_id"] == current_user["id"] and membership["role"] in ["manager", "admin"]:
                team = next((t for t in data_manager.teams if t["id"] == membership["team_id"]), None)
                if team:
                    user_teams.append(team)
        
        # Get all members from user's teams
        team_members = []
        seen_user_ids = set()
        
        for team in user_teams:
            members = data_manager.user_repository.find_by_team(data_manager.team_memberships, team["id"])
            for member in members:
                if member["id"] not in seen_user_ids:
                    seen_user_ids.add(member["id"])
                    team_members.append(member)
        
        # If admin, return all users
        if current_user["role"] == "admin":
            team_members = data_manager.user_repository.find_all()
        
        log_action(request, "TEAM_MEMBERS_LIST", {
            "managerId": current_user["id"],
            "memberCount": len(team_members)
        })
        
        return team_members
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 