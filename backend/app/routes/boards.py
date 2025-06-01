from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from ..models import BoardIn, BoardMembershipIn, ListIn, CustomStatusIn, CustomTaskTypeIn, BoardStatusesUpdate
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["boards"])

@router.post("/boards")
def create_board(board_in: BoardIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a new board (admin/manager only)"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        board = data_manager.board_service.create_board(
            name=board_in.name,
            description=board_in.description,
            project_id=board_in.project_id,
            created_by=current_user["id"]
        )
        log_action(request, "BOARD_CREATE", {
            "boardId": board["id"],
            "boardName": board["name"],
            "projectId": board["project_id"],
            "createdBy": current_user["id"]
        })
        return board
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/projects/{project_id}/boards")
def list_project_boards(project_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """List boards for a project"""
    try:
        # Check project access
        user_projects = data_manager.project_service.get_user_projects(current_user["id"], current_user["role"])
        user_project_ids = [p["id"] for p in user_projects]
        
        if project_id not in user_project_ids:
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        boards = data_manager.board_service.get_project_boards(project_id)
        log_action(request, "PROJECT_BOARDS_LIST", {"projectId": project_id, "requestedBy": current_user["id"]})
        return boards
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/boards/{board_id}")
def get_board_details(board_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get board with lists and tasks"""
    try:
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        board = data_manager.board_service.get_board_with_details(board_id)
        
        # Get tasks for each list and enhance with assignee information
        for board_list in board["lists"]:
            tasks = data_manager.task_repository.find_tasks_by_list(board_list["id"])
            
            # Enhance tasks with assignee names and comment counts
            enhanced_tasks = []
            for task in tasks:
                enhanced_task = task.copy()
                
                # Add assignee name if assignee exists
                if task.get("assignee_id"):
                    assignee = data_manager.user_repository.find_by_id(task["assignee_id"])
                    if assignee:
                        enhanced_task["assignee_name"] = assignee["full_name"]
                
                # Add comment count
                comments = data_manager.comment_repository.find_task_comments(task["id"])
                enhanced_task["comments_count"] = len(comments)
                
                # Add attachments count (placeholder for now)
                enhanced_task["attachments_count"] = 0
                
                enhanced_tasks.append(enhanced_task)
            
            board_list["tasks"] = enhanced_tasks
        
        log_action(request, "BOARD_GET", {"boardId": board_id, "requestedBy": current_user["id"]})
        return board
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/boards/{board_id}/enroll_member")
def enroll_board_member(board_id: str, membership_in: BoardMembershipIn, request: Request,
                       current_user: dict = Depends(get_current_user)):
    """Enroll a member in a board (manager/admin only)"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Verify board exists
        board = data_manager.board_repository.find_by_id(board_id)
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        
        # Verify user exists
        user = data_manager.user_repository.find_by_id(membership_in.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        membership = data_manager.board_service.enroll_user_in_board(
            user_id=membership_in.user_id,
            board_id=board_id,
            enrolled_by=current_user["id"]
        )
        
        # Create notification for enrolled user
        if user and board:
            data_manager.notification_service.create_board_enrolled_notification(
                user_id=membership_in.user_id,
                board_name=board["name"],
                enrolled_by_name=current_user["full_name"],
                board_id=board_id
            )
        
        log_action(request, "BOARD_ENROLL_MEMBER", {
            "boardId": board_id,
            "userId": membership_in.user_id,
            "enrolledBy": current_user["id"]
        })
        return membership
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/boards/{board_id}/members/{user_id}")
def remove_board_member(board_id: str, user_id: str, request: Request,
                       current_user: dict = Depends(get_current_user)):
    """Remove a member from a board (manager/admin only)"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Verify board exists
        board = data_manager.board_repository.find_by_id(board_id)
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        
        # Verify user exists
        user = data_manager.user_repository.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is actually enrolled in the board
        if not data_manager.board_repository.is_user_enrolled_in_board(user_id, board_id):
            raise HTTPException(status_code=404, detail="User not found in board")
        
        success = data_manager.board_service.remove_user_from_board(user_id, board_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found in board")
        
        log_action(request, "BOARD_REMOVE_MEMBER", {
            "boardId": board_id,
            "userId": user_id,
            "removedBy": current_user["id"]
        })
        return {"status": "removed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/boards/{board_id}/members")
def list_board_members(board_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """List members of a board"""
    try:
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        members = data_manager.board_service.get_board_members(board_id)
        log_action(request, "BOARD_MEMBERS_LIST", {"boardId": board_id, "requestedBy": current_user["id"]})
        return members
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/users/me/boards")
def get_user_boards(request: Request, current_user: dict = Depends(get_current_user)):
    """Get boards the current user is enrolled in"""
    boards = data_manager.board_service.get_user_boards(current_user["id"])
    log_action(request, "USER_BOARDS_GET", {"userId": current_user["id"]})
    return boards

@router.post("/lists")
def create_list(list_in: ListIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a new list within a board"""
    try:
        # Check board access
        board_id = list_in.board_id
        if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        board_list = data_manager.board_service.create_list(
            name=list_in.name,
            board_id=list_in.board_id,
            position=list_in.position
        )
        log_action(request, "LIST_CREATE", {
            "listId": board_list["id"],
            "listName": board_list["name"],
            "boardId": board_id,
            "createdBy": current_user["id"]
        })
        return board_list
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/boards/{board_id}/statuses")
def get_board_statuses(board_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get available statuses for a board"""
    try:
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        # Get board statuses
        statuses = data_manager.board_service.get_board_statuses(board_id)
        
        log_action(request, "BOARD_STATUSES_GET", {"boardId": board_id, "requestedBy": current_user["id"]})
        return statuses
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/boards/{board_id}/task-types")
def get_board_task_types(board_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get available task types for a board"""
    try:
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        # For now, return default task types
        # In future, this will return custom task types per board
        default_task_types = [
            {"id": "feature", "name": "Feature", "color": "#3B82F6", "icon": "feature"},
            {"id": "bug", "name": "Bug", "color": "#EF4444", "icon": "bug"},
            {"id": "research", "name": "Research", "color": "#8B5CF6", "icon": "research"},
            {"id": "fix", "name": "Fix", "color": "#F97316", "icon": "fix"},
            {"id": "story", "name": "Story", "color": "#10B981", "icon": "story"},
            {"id": "task", "name": "Task", "color": "#6B7280", "icon": "task"}
        ]
        
        log_action(request, "BOARD_TASK_TYPES_GET", {"boardId": board_id, "requestedBy": current_user["id"]})
        return default_task_types
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/boards/{board_id}/statuses")
def add_board_status(board_id: str, status_in: CustomStatusIn, request: Request, 
                    current_user: dict = Depends(get_current_user)):
    """Add a custom status to a board (admin/manager only)"""
    # Check permissions
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can add statuses")
    
    # Check board access
    if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
        raise HTTPException(status_code=403, detail="Access denied to this board")
    
    # TODO: Implement custom status storage
    # For now, return a success message
    log_action(request, "BOARD_STATUS_ADD", {
        "boardId": board_id,
        "statusName": status_in.name,
        "addedBy": current_user["id"]
    })
    
    return {"message": "Custom status feature coming soon"}

@router.post("/boards/{board_id}/task-types")
def add_board_task_type(board_id: str, task_type_in: CustomTaskTypeIn, request: Request,
                       current_user: dict = Depends(get_current_user)):
    """Add a custom task type to a board (admin/manager only)"""
    # Check permissions
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can add task types")
    
    # Check board access
    if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
        raise HTTPException(status_code=403, detail="Access denied to this board")
    
    # TODO: Implement custom task type storage
    # For now, return a success message
    log_action(request, "BOARD_TASK_TYPE_ADD", {
        "boardId": board_id,
        "taskTypeName": task_type_in.name,
        "addedBy": current_user["id"]
    })
    
    return {"message": "Custom task type feature coming soon"}

@router.put("/boards/{board_id}/statuses")
def update_board_statuses(board_id: str, statuses_update: BoardStatusesUpdate, request: Request, 
                         current_user: dict = Depends(get_current_user)):
    """Update all statuses for a board (admin/manager only)"""
    # Check permissions
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can update statuses")
    
    # Check board access
    if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
        raise HTTPException(status_code=403, detail="Access denied to this board")
    
    try:
        # Convert statuses to dict format
        statuses = [status.dict() for status in statuses_update.statuses]
        
        # Update statuses and handle migrations
        updated_statuses = data_manager.board_service.update_board_statuses(
            board_id, statuses, statuses_update.migrationMapping
        )
        
        log_action(request, "BOARD_STATUSES_UPDATE", {
            "boardId": board_id,
            "statusCount": len(statuses),
            "migrations": len(statuses_update.migrationMapping),
            "updatedBy": current_user["id"]
        })
        
        return updated_statuses
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/boards/{board_id}/task-counts")
def get_board_task_counts(board_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get task counts by status for a board"""
    try:
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        # Get task counts
        task_counts = data_manager.board_service.get_task_counts_by_status(board_id)
        
        log_action(request, "BOARD_TASK_COUNTS_GET", {"boardId": board_id, "requestedBy": current_user["id"]})
        return task_counts
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/boards/{board_id}")
def delete_board(board_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a board (cascade deletes all tasks)"""
    try:
        # Get board details
        board = data_manager.board_repository.find_by_id(board_id)
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        
        # Get project details
        project = data_manager.project_repository.find_by_id(board["project_id"])
        if not project:
            raise HTTPException(status_code=404, detail="Associated project not found")
        
        # Check permissions
        if current_user["role"] == "admin":
            # Admins can delete any board
            pass
        elif current_user["role"] == "manager":
            # Managers can only delete boards in projects they created or are assigned to
            is_project_creator = project.get("created_by") == current_user["id"]
            is_project_manager = data_manager.project_repository.is_manager_assigned_to_project(
                current_user["id"], board["project_id"]
            )
            is_board_creator = board.get("created_by") == current_user["id"]
            
            if not (is_project_creator or is_project_manager or is_board_creator):
                raise HTTPException(status_code=403, detail="You can only delete boards in projects you manage or boards you created")
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions to delete boards")
        
        # Get all lists and tasks for cascade deletion and logging
        lists = data_manager.board_repository.find_board_lists(board_id)
        task_count = 0
        
        # Delete all tasks in all lists
        for list_item in lists:
            tasks = data_manager.task_repository.find_tasks_by_list(list_item["id"])
            task_count += len(tasks)
            
            # Delete task-related data
            for task in tasks:
                task_id = task["id"]
                
                # Delete task comments
                data_manager.comments[:] = [c for c in data_manager.comments if c.get("task_id") != task_id]
                
                # Delete task activities
                data_manager.task_activities[:] = [ta for ta in data_manager.task_activities 
                                                  if ta.get("task_id") != task_id]
            
            # Delete all tasks for this list
            data_manager.tasks[:] = [t for t in data_manager.tasks if t.get("list_id") != list_item["id"]]
        
        # Delete all lists in the board
        data_manager.lists[:] = [l for l in data_manager.lists if l.get("board_id") != board_id]
        
        # Delete board memberships
        data_manager.board_memberships[:] = [bm for bm in data_manager.board_memberships 
                                           if bm.get("board_id") != board_id]
        
        # Delete board statuses - check if board_statuses exists and handle safely
        if hasattr(data_manager, 'board_statuses') and data_manager.board_statuses is not None:
            data_manager.board_statuses[:] = [bs for bs in data_manager.board_statuses 
                                            if bs.get("board_id") != board_id]
        
        # Finally, delete the board
        data_manager.boards[:] = [b for b in data_manager.boards if b.get("id") != board_id]
        
        log_action(request, "BOARD_DELETE", {
            "boardId": board_id,
            "boardName": board["name"],
            "projectId": board["project_id"],
            "deletedBy": current_user["id"],
            "cascadeDeleted": {
                "lists": len(lists),
                "tasks": task_count
            }
        })
        
        return {
            "status": "deleted",
            "board": board["name"],
            "cascadeDeleted": {
                "lists": len(lists),
                "tasks": task_count
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        # Log the actual error for debugging
        import traceback
        print(f"Error deleting board {board_id}: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") 