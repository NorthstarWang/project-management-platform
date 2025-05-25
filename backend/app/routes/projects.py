from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from ..models import TeamIn, ProjectIn, ProjectAssignmentIn
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["projects"])

# ============================================================================
# TEAM MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/teams")
def create_team(team_in: TeamIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a new team (admin/manager only)"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        team = data_manager.project_service.create_team(team_in.name, team_in.description)
        log_action(request, "TEAM_CREATE", {
            "teamId": team["id"],
            "teamName": team["name"],
            "createdBy": current_user["id"]
        })
        return team
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams")
def list_user_teams(request: Request, current_user: dict = Depends(get_current_user)):
    """List teams the current user belongs to"""
    teams = data_manager.project_service.get_user_teams(current_user["id"])
    log_action(request, "TEAMS_LIST", {"userId": current_user["id"]})
    return teams

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
        
        log_action(request, "TEAM_GET", {"teamId": team_id, "requestedBy": current_user["id"]})
        return {**team, "members": members}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ============================================================================
# PROJECT MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/projects")
def create_project(project_in: ProjectIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a new project (admin/manager only)"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        project = data_manager.project_service.create_project(
            name=project_in.name,
            description=project_in.description,
            team_id=project_in.team_id,
            created_by=current_user["id"]
        )
        log_action(request, "PROJECT_CREATE", {
            "projectId": project["id"],
            "projectName": project["name"],
            "teamId": project["team_id"],
            "createdBy": current_user["id"]
        })
        return project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/projects")
def list_user_projects(request: Request, current_user: dict = Depends(get_current_user)):
    """List projects accessible to the current user"""
    projects = data_manager.project_service.get_user_projects(current_user["id"], current_user["role"])
    log_action(request, "PROJECTS_LIST", {"userId": current_user["id"]})
    return projects

@router.get("/projects/{project_id}")
def get_project_details(project_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get project details"""
    try:
        project = data_manager.project_repository.find_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check access
        user_projects = data_manager.project_service.get_user_projects(current_user["id"], current_user["role"])
        user_project_ids = [p["id"] for p in user_projects]
        
        if project_id not in user_project_ids:
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        log_action(request, "PROJECT_GET", {"projectId": project_id, "requestedBy": current_user["id"]})
        return project
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/projects/{project_id}/assign_manager")
def assign_project_manager(project_id: str, assignment_in: ProjectAssignmentIn, request: Request, 
                          current_user: dict = Depends(get_current_user)):
    """Assign a manager to a project (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign project managers")
    
    try:
        # Verify project exists
        project = data_manager.project_repository.find_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Verify manager exists and has manager role
        manager = data_manager.user_repository.find_by_id(assignment_in.manager_id)
        if not manager:
            raise HTTPException(status_code=404, detail="Manager not found")
        
        if manager["role"] not in ["manager", "admin"]:
            raise HTTPException(status_code=400, detail="User must have manager or admin role")
        
        assignment = data_manager.project_service.assign_manager_to_project(
            project_id=project_id,
            manager_id=assignment_in.manager_id,
            assigned_by=current_user["id"]
        )
        
        # Create notification for the assigned manager
        if manager and project:
            data_manager.notification_service.create_project_assigned_notification(
                manager_id=assignment_in.manager_id,
                project_name=project["name"],
                assigned_by_name=current_user["full_name"],
                project_id=project_id
            )
        
        log_action(request, "PROJECT_ASSIGN_MANAGER", {
            "projectId": project_id,
            "managerId": assignment_in.manager_id,
            "assignedBy": current_user["id"]
        })
        return assignment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/projects/{project_id}/managers")
def list_project_managers(project_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """List managers assigned to a project"""
    try:
        managers = data_manager.project_service.get_project_managers(project_id)
        log_action(request, "PROJECT_MANAGERS_LIST", {"projectId": project_id, "requestedBy": current_user["id"]})
        return managers
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/users/me/assigned_projects")
def get_manager_assigned_projects(request: Request, current_user: dict = Depends(get_current_user)):
    """Get projects assigned to current user as manager"""
    if current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers can access assigned projects")
    
    projects = data_manager.project_repository.find_manager_projects(current_user["id"])
    log_action(request, "MANAGER_PROJECTS_GET", {"managerId": current_user["id"]})
    return projects 