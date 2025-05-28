from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from ..models import BoardIn, BoardMembershipIn, ListIn
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