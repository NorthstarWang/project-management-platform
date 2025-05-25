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