from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from ..models import TaskIn, TaskUpdate, TaskMoveIn
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["tasks"])

@router.post("/tasks")
def create_task(task_in: TaskIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    try:
        # Check board access via list
        task_list = next((l for l in data_manager.lists if l["id"] == task_in.list_id), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        # Verify board exists
        board = data_manager.board_repository.find_by_id(task_list["board_id"])
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        # Validate assignee if provided
        if task_in.assignee_id:
            assignee = data_manager.user_repository.find_by_id(task_in.assignee_id)
            if not assignee:
                raise HTTPException(status_code=404, detail="Assignee not found")
        
        task = data_manager.task_service.create_task(
            title=task_in.title,
            description=task_in.description,
            list_id=task_in.list_id,
            created_by=current_user["id"],
            assignee_id=task_in.assignee_id,
            priority=task_in.priority.value if task_in.priority else "medium",
            due_date=task_in.due_date,
            position=task_in.position,
            status=task_in.status.value if task_in.status else "todo",
            task_type=task_in.task_type.value if task_in.task_type else "task"
        )
        
        log_action(request, "TASK_CREATE", {
            "text": f"User {current_user['full_name']} created task {task['title']} in list {task['list_id']}",
            "taskId": task["id"],
            "taskTitle": task["title"],
            "listId": task["list_id"],
            "assigneeId": task.get("assignee_id"),
            "createdBy": current_user["id"]
        })
        return task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/tasks/{task_id}")
def update_task(task_id: str, task_update: TaskUpdate, request: Request, 
               current_user: dict = Depends(get_current_user)):
    """Update a task"""
    try:
        # Get existing task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check board access
        task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        # Validate assignee if provided
        if task_update.assignee_id:
            assignee = data_manager.user_repository.find_by_id(task_update.assignee_id)
            if not assignee:
                raise HTTPException(status_code=404, detail="Assignee not found")
        
        updated_task = data_manager.task_service.update_task(
            task_id=task_id,
            updates=task_update.dict(exclude_unset=True),
            updated_by=current_user["id"]
        )
        
        log_action(request, "TASK_UPDATE", {
            "text": f"User {current_user['full_name']} updated task {task['title']} in list {task['list_id']} with updates {task_update.dict(exclude_unset=True)}",
            "taskId": task_id,
            "updates": task_update.dict(exclude_unset=True),
            "updatedBy": current_user["id"]
        })
        return updated_task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    try:
        # Get existing task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check board access
        task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        data_manager.task_service.delete_task(task_id, current_user["id"])
        log_action(request, "TASK_DELETE", {
            "text": f"User {current_user['full_name']} deleted task {task['title']}",
            "taskId": task_id,
            "deletedBy": current_user["id"]
        })
        return {"status": "deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/tasks/{task_id}/move")
def move_task(task_id: str, move_data: TaskMoveIn, request: Request, 
             current_user: dict = Depends(get_current_user)):
    """Move a task to a different list"""
    try:
        # Get existing task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Get source list
        source_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not source_list:
            raise HTTPException(status_code=404, detail="Source list not found")
        
        # Get target list
        target_list = next((l for l in data_manager.lists if l["id"] == move_data.list_id), None)
        if not target_list:
            raise HTTPException(status_code=404, detail="Target list not found")
        
        # Check board access for both lists
        if not data_manager.board_service.check_user_board_access(current_user["id"], source_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to source board")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], target_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to target board")
        
        moved_task = data_manager.task_service.move_task(
            task_id=task_id,
            new_list_id=move_data.list_id,
            moved_by=current_user["id"],
            position=move_data.position
        )
        
        log_action(request, "TASK_MOVE", {
            "text": f"User {current_user['full_name']} moved task {task['title']} from list {source_list['id']} to list {move_data.list_id}",
            "taskId": task_id,
            "fromListId": source_list["id"],
            "toListId": move_data.list_id,
            "position": move_data.position,
            "movedBy": current_user["id"]
        })
        return moved_task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/tasks/{task_id}/archive")
def archive_task(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Archive a task"""
    try:
        # Get existing task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check board access
        task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        archived_task = data_manager.task_service.archive_task(task_id, current_user["id"])
        
        log_action(request, "TASK_ARCHIVE", {
            "text": f"User {current_user['full_name']} archived task {task['title']}",
            "taskId": task_id,
            "archivedBy": current_user["id"]
        })
        return archived_task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/tasks/{task_id}/unarchive")
def unarchive_task(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Unarchive a task"""
    try:
        # Get existing task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check board access
        task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        unarchived_task = data_manager.task_service.unarchive_task(task_id, current_user["id"])
        
        log_action(request, "TASK_UNARCHIVE", {
            "text": f"User {current_user['full_name']} unarchived task {task['title']}",
            "taskId": task_id,
            "unarchivedBy": current_user["id"]
        })
        return unarchived_task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tasks/{task_id}/full")
def get_task_full_details(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get task with comments and activities"""
    try:
        # Get task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check board access
        task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        # Get comments and activities
        comments = data_manager.comment_service.get_task_comments_with_replies(task_id)
        activities = data_manager.task_service.get_task_activities(task_id)
        
        log_action(request, "TASK_FULL_GET", {
            "text": f"User {current_user['full_name']} viewed full details for task {task['title']}",
            "taskId": task_id,
            "requestedBy": current_user["id"]
        })
        
        return {
            **task,
            "comments": comments,
            "activities": activities
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/tasks/{task_id}")
def get_task_details(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get task details"""
    try:
        # Get task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check board access
        task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        log_action(request, "TASK_GET", {
            "text": f"User {current_user['full_name']} viewed task {task['title']}",
            "taskId": task_id,
            "requestedBy": current_user["id"]
        })
        return task
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/tasks/{task_id}/activities")
def get_task_activities(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get task activity timeline"""
    try:
        # Get task
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check board access
        task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        activities = data_manager.task_service.get_task_activities(task_id)
        
        log_action(request, "TASK_ACTIVITIES_GET", {
            "text": f"User {current_user['full_name']} viewed activities for task {task['title']}",
            "taskId": task_id,
            "requestedBy": current_user["id"]
        })
        return activities
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) 