from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from .dependencies import get_current_user, log_action
from ..models.user_models import UserProfileUpdate, UserProfile

router = APIRouter(prefix="/api", tags=["users"])

@router.get("/users")
def list_users(request: Request, current_user: dict = Depends(get_current_user)):
    """List users (admin/manager only)"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    users = data_manager.user_service.get_all_users()
    log_action(request, "USERS_LIST", {
        "text": f"User {current_user['full_name']} listed users",
        "requestedBy": current_user["id"]
    })
    return users

@router.get("/users/me")
def get_current_user_info(request: Request, current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    log_action(request, "USER_ME_GET", {
        "text": f"User {current_user['full_name']} viewed their own profile",
        "userId": current_user["id"]
    })
    return current_user

@router.get("/users/me/profile", response_model=UserProfile)
def get_current_user_profile(request: Request, current_user: dict = Depends(get_current_user)):
    """Get current user's detailed profile"""
    try:
        profile = data_manager.user_service.get_user_profile(current_user["id"])
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        log_action(request, "USER_PROFILE_GET", {
            "text": f"User {current_user['full_name']} viewed their own profile",
            "userId": current_user["id"]
        })
        return profile
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/users/me/profile", response_model=UserProfile)
def update_current_user_profile(
    profile_update: UserProfileUpdate,
    request: Request, 
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    try:
        # Convert pydantic model to dict, excluding None values
        update_data = profile_update.dict(exclude_none=True)
        
        # Update the profile
        updated_profile = data_manager.user_service.update_user_profile(
            current_user["id"], 
            update_data
        )
        
        log_action(request, "USER_PROFILE_UPDATE", {
            "text": f"User {current_user['full_name']} updated their profile with updates {update_data}",
            "userId": current_user["id"],
            "updatedFields": list(update_data.keys())
        })
        
        return updated_profile
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@router.get("/users/me/statistics")
def get_current_user_statistics(request: Request, current_user: dict = Depends(get_current_user)):
    """Get current user's activity statistics"""
    try:
        stats = data_manager.user_service.get_user_statistics(current_user["id"])
        
        log_action(request, "USER_STATISTICS_GET", {
            "text": f"User {current_user['full_name']} viewed their own statistics",
            "userId": current_user["id"]
        })
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user statistics: {str(e)}")

@router.get("/users/{user_id}/profile", response_model=UserProfile)
def get_user_profile(
    user_id: str,
    request: Request, 
    current_user: dict = Depends(get_current_user)
):
    """Get a specific user's profile (admin/manager only or own profile)"""
    # Users can view their own profile, admins/managers can view any profile
    if current_user["id"] != user_id and current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        profile = data_manager.user_service.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        log_action(request, "USER_PROFILE_GET", {
            "text": f"User {current_user['full_name']} viewed profile for user {user_id}",
            "userId": user_id,
            "requestedBy": current_user["id"]
        })
        
        return profile
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

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
        
        log_action(request, "USER_ME_TASKS_GET", {
            "text": f"User {current_user['full_name']} viewed tasks assigned to them",
            "userId": current_user["id"]
        })
        return enhanced_tasks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/users/{user_id}/assigned_tasks")
def get_user_assigned_tasks(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get tasks assigned to a specific user"""
    # Users can see their own tasks
    if current_user["id"] == user_id:
        # User is viewing their own tasks
        pass
    elif current_user["role"] == "admin":
        # Admins can see any user's tasks
        pass
    else:
        # Check if current user is a manager of any team where the target user is a member
        is_team_manager_of_user = False
        
        # Get teams where current user is a manager
        manager_teams = []
        for membership in data_manager.team_memberships:
            if membership["user_id"] == current_user["id"] and membership["role"] in ["manager", "admin"]:
                manager_teams.append(membership["team_id"])
        
        # Check if target user is in any of those teams
        if manager_teams:
            for membership in data_manager.team_memberships:
                if membership["user_id"] == user_id and membership["team_id"] in manager_teams:
                    is_team_manager_of_user = True
                    break
        
        if not is_team_manager_of_user:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        tasks = data_manager.task_service.get_user_assigned_tasks(user_id)
        
        # Enhance tasks with board and project names
        enhanced_tasks = []
        for task in tasks:
            enhanced_task = task.copy()
            
            # Get board info
            board = next((b for b in data_manager.boards if b["id"] == task.get("board_id")), None)
            if board:
                enhanced_task["board_name"] = board["name"]
                
                # Get project info
                project = next((p for p in data_manager.projects if p["id"] == board.get("project_id")), None)
                if project:
                    enhanced_task["project_name"] = project["name"]
            
            # Add assignee name
            user = data_manager.user_repository.find_by_id(user_id)
            if user:
                enhanced_task["assignee_name"] = user["full_name"]
            
            enhanced_tasks.append(enhanced_task)
        
        log_action(request, "USER_TASKS_GET", {
            "text": f"User {current_user['full_name']} viewed tasks assigned to user {user_id}",
            "userId": user_id,
            "requestedBy": current_user["id"]
        })
        return enhanced_tasks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/users/me/teams")
def get_my_teams_with_roles(request: Request, current_user: dict = Depends(get_current_user)):
    """Get user's teams with their role in each team"""
    try:
        # Get user's teams
        user_teams = data_manager.team_repository.get_user_teams(current_user["id"])
        
        # Enhance with user's role in each team
        enhanced_teams = []
        for team in user_teams:
            # Find user's membership in this team
            membership = next((m for m in data_manager.team_memberships 
                             if m["user_id"] == current_user["id"] and m["team_id"] == team["id"]), None)
            
            if membership:
                enhanced_teams.append({
                    **team,
                    "user_role": membership.get("role", "member")
                })
        
        log_action(request, "USER_TEAMS_WITH_ROLES_GET", {
            "userId": current_user["id"],
            "teamsCount": len(enhanced_teams)
        })
        
        return enhanced_teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/me/team-members")
def get_my_team_members(request: Request, current_user: dict = Depends(get_current_user)):
    """Get team members for users who are team managers"""
    
    try:
        # Check if user is a manager in any team
        is_team_manager = False
        user_teams = []
        
        for membership in data_manager.team_memberships:
            if membership["user_id"] == current_user["id"] and membership["role"] in ["manager", "admin"]:
                is_team_manager = True
                team = next((t for t in data_manager.teams if t["id"] == membership["team_id"]), None)
                if team:
                    user_teams.append(team)
        
        # If user is not a team manager and not an admin, deny access
        if not is_team_manager and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only team managers and admins can view team members")
        
        # Get all members from user's teams
        team_members = []
        seen_user_ids = set()
        
        # Don't include the current user in the team members list
        seen_user_ids.add(current_user["id"])
        
        for team in user_teams:
            members = data_manager.user_repository.find_by_team(data_manager.team_memberships, team["id"])
            for member in members:
                if member["id"] not in seen_user_ids:
                    seen_user_ids.add(member["id"])
                    team_members.append(member)
        
        # If admin, return all users except the admin
        if current_user["role"] == "admin":
            all_users = data_manager.user_repository.find_all()
            team_members = [u for u in all_users if u["id"] != current_user["id"]]
        
        log_action(request, "TEAM_MEMBERS_LIST", {
            "text": f"User {current_user['full_name']} viewed team members",
            "managerId": current_user["id"],
            "memberCount": len(team_members)
        })
        
        return team_members
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 