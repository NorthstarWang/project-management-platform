from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["users"])

def get_current_user_id(request: Request):
    """Extract user ID from request headers"""
    user_id = request.headers.get("x-user-id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id

def get_current_user(request: Request):
    """Get current user object"""
    user_id = get_current_user_id(request)
    user = data_manager.user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def log_action(request: Request, action_type: str, payload: dict):
    """Log an action with session tracking"""
    session_id = request.query_params.get("session_id")
    if session_id:
        logger.log_action(session_id, action_type, payload)

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