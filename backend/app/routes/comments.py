from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from ..models import CommentIn
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["comments"])

@router.post("/comments")
def create_comment(comment_in: CommentIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a comment on a task"""
    try:
        # Check task exists and board access
        task = data_manager.task_repository.find_by_id(comment_in.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_list = next((lst for lst in data_manager.lists if lst["id"] == task["list_id"]), None)
        if not task_list:
            raise HTTPException(status_code=404, detail="Task list not found")
        
        # Verify board exists
        board = data_manager.board_repository.find_by_id(task_list["board_id"])
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        # Validate parent comment if provided
        if comment_in.parent_comment_id:
            parent_comment = data_manager.comment_repository.find_by_id(comment_in.parent_comment_id)
            if not parent_comment:
                raise HTTPException(status_code=404, detail="Parent comment not found")
            if parent_comment["task_id"] != comment_in.task_id:
                raise HTTPException(status_code=400, detail="Parent comment must be on the same task")
        
        comment = data_manager.comment_service.create_comment(
            content=comment_in.content,
            task_id=comment_in.task_id,
            author_id=current_user["id"],
            parent_comment_id=comment_in.parent_comment_id
        )
        
        # Add author information to the response
        comment_with_author = {
            **comment,
            "author": current_user
        }
        
        # Create notification if task is assigned to someone else
        if task["assignee_id"] and task["assignee_id"] != current_user["id"]:
            data_manager.notification_service.create_task_commented_notification(
                assignee_id=task["assignee_id"],
                task_title=task["title"],
                commenter_name=current_user["full_name"],
                task_id=comment_in.task_id
            )
        
        log_action(request, "COMMENT_CREATE", {
            "text": f"User {current_user['full_name']} created comment {comment['id']} on task {comment_in.task_id}",
            "commentId": comment["id"],
            "taskId": comment_in.task_id,
            "parentCommentId": comment_in.parent_comment_id,
            "authorId": current_user["id"]
        })
        return comment_with_author
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tasks/{task_id}/comments")
def list_task_comments(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """List comments for a task (threaded)"""
    try:
        # Check task exists and board access
        task = data_manager.task_repository.find_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_list = next((lst for lst in data_manager.lists if lst["id"] == task["list_id"]), None)
        if not task_list or not data_manager.board_service.check_user_board_access(current_user["id"], task_list["board_id"], current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied")
        
        comments = data_manager.comment_service.get_task_comments_with_replies(task_id)
        log_action(request, "TASK_COMMENTS_GET", {
            "text": f"User {current_user['full_name']} viewed comments for task {task_id}",
            "taskId": task_id,
            "requestedBy": current_user["id"]
        })
        return comments
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) 