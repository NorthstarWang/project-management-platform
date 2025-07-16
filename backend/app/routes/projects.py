from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from ..models import ProjectIn, ProjectAssignmentIn
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["projects"])

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
            created_by=current_user["id"],
            icon=project_in.icon
        )
        log_action(request, "PROJECT_CREATE", {
            "text": f"User {current_user['full_name']} created project {project['name']}",
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
    log_action(request, "PROJECTS_LIST", {
        "text": f"User {current_user['full_name']} listed projects",
        "userId": current_user["id"]
    })
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
        
        log_action(request, "PROJECT_GET", {
            "text": f"User {current_user['full_name']} viewed project {project_id}",
            "projectId": project_id,
            "requestedBy": current_user["id"]
        })
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
            "text": f"User {current_user['full_name']} assigned manager {assignment_in.manager_id} to project {project_id}",
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
        log_action(request, "PROJECT_MANAGERS_LIST", {
            "text": f"User {current_user['full_name']} listed managers for project {project_id}",
            "projectId": project_id,
            "requestedBy": current_user["id"]
        })
        return managers
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/users/me/assigned_projects")
def get_manager_assigned_projects(request: Request, current_user: dict = Depends(get_current_user)):
    """Get projects assigned to current user as manager"""
    if current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only managers can access assigned projects")
    
    projects = data_manager.project_repository.find_manager_projects(current_user["id"])
    log_action(request, "MANAGER_PROJECTS_GET", {
        "text": f"User {current_user['full_name']} viewed projects assigned to them as manager",
        "managerId": current_user["id"]
    })
    return projects

@router.delete("/projects/{project_id}")
def delete_project(project_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a project (cascade deletes all boards and tasks)"""
    try:
        # Get project details
        project = data_manager.project_repository.find_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check permissions
        if current_user["role"] == "admin":
            # Admins can delete any project
            pass
        elif current_user["role"] == "manager":
            # Managers can only delete projects they created or are assigned to
            is_creator = project.get("created_by") == current_user["id"]
            is_assigned = data_manager.project_repository.is_manager_assigned_to_project(
                current_user["id"], project_id
            )
            if not (is_creator or is_assigned):
                raise HTTPException(status_code=403, detail="You can only delete projects you created or are assigned to")
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions to delete projects")
        
        # Get all boards in this project for cascade deletion
        boards = data_manager.board_repository.find_boards_by_project(project_id)
        board_ids = [board["id"] for board in boards]
        
        # Get all tasks in these boards for logging purposes
        task_count = 0
        for board_id in board_ids:
            lists = data_manager.board_repository.find_board_lists(board_id)
            for list_item in lists:
                tasks = data_manager.task_repository.find_tasks_by_list(list_item["id"])
                task_count += len(tasks)
        
        # Perform cascade deletion
        # 1. Delete all tasks in all boards
        for board_id in board_ids:
            lists = data_manager.board_repository.find_board_lists(board_id)
            for list_item in lists:
                tasks = data_manager.task_repository.find_tasks_by_list(list_item["id"])
                for task in tasks:
                    task_id = task["id"]
                    # Delete task comments
                    data_manager.comments[:] = [c for c in data_manager.comments if c.get("task_id") != task_id]
                    # Delete task activities  
                    data_manager.task_activities[:] = [ta for ta in data_manager.task_activities 
                                                      if ta.get("task_id") != task_id]
                
                # Delete all tasks for this list
                data_manager.tasks[:] = [t for t in data_manager.tasks if t.get("list_id") != list_item["id"]]
            
            # 2. Delete all lists in the board
            data_manager.lists[:] = [lst for lst in data_manager.lists if lst.get("board_id") != board_id]
            
            # 3. Delete board memberships
            data_manager.board_memberships[:] = [bm for bm in data_manager.board_memberships 
                                               if bm.get("board_id") != board_id]
            
            # 4. Delete board statuses - check if board_statuses exists and handle safely
            if hasattr(data_manager, 'board_statuses') and data_manager.board_statuses is not None:
                data_manager.board_statuses[:] = [bs for bs in data_manager.board_statuses 
                                                if bs.get("board_id") != board_id]
        
        # 5. Delete all boards
        data_manager.boards[:] = [b for b in data_manager.boards if b.get("project_id") != project_id]
        
        # 6. Delete project assignments
        data_manager.project_assignments[:] = [pa for pa in data_manager.project_assignments 
                                             if pa.get("project_id") != project_id]
        
        # 7. Finally, delete the project
        data_manager.projects[:] = [p for p in data_manager.projects if p.get("id") != project_id]
        
        log_action(request, "PROJECT_DELETE", {
            "text": f"User {current_user['full_name']} deleted project {project['name']}",
            "projectId": project_id,
            "projectName": project["name"],
            "deletedBy": current_user["id"],
            "cascadeDeleted": {
                "boards": len(board_ids),
                "tasks": task_count
            }
        })
        
        return {
            "status": "deleted",
            "project": project["name"],
            "cascadeDeleted": {
                "boards": len(board_ids),
                "tasks": task_count
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 