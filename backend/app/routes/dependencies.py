from fastapi import Request, HTTPException
from ..data_manager import data_manager
from ..logger import logger

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