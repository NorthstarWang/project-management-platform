from fastapi import APIRouter, Request, Body, Query
from fastapi.responses import JSONResponse
import uuid
from typing import Any, Dict, Optional
from ..logger import logger
from ..data_manager import data_manager

router = APIRouter()

@router.post("/reset")
def reset_environment(seed: Optional[str] = None):
    logger.clear_logs()
    data_manager.reset(seed)
    return {"status": "ok", "seed": seed}

@router.post("/new_session")
def new_session(seed: Optional[str] = None, reset: bool = False):
    """Initialize a new session with optional seed and reset"""
    session_id = str(uuid.uuid4())
    
    # Only reset the environment if explicitly requested
    if reset:
        data_manager.reset(seed)
        logger.clear_logs()
        print(f"🔄 Session {session_id}: Data reset requested with seed: {seed}")
    else:
        # Just clear logs for the new session, preserve data
        logger.clear_logs()
        print(f"📝 Session {session_id}: New session created, data preserved")
    
    return {"session_id": session_id}

@router.post("/log_event")
def log_event(
    event: Dict[str, Any] = Body(...), 
    session_id: str = Query(None)
):
    """Log a custom event"""
    action_type = event.get("actionType", "CUSTOM_EVENT")
    payload = event.get("payload", {})
    
    logger.log_action(session_id, action_type, payload)
    return {"status": "logged"}

@router.post("/augment_state")
def augment_state(data: Dict[str, Any]):
    """Add to or modify parts of the backend state"""
    data_manager.augment_state(data)
    return {"status": "ok", "message": "State augmented with provided data."}

@router.post("/set_state")
def set_state(data: Dict[str, Any]):
    """Replace the entire backend state"""
    data_manager.set_state(data)
    return {"status": "ok", "message": "State has been overwritten."}

@router.get("/state")
def get_state():
    """Get current backend state"""
    return data_manager.get_full_state()

@router.get("/logs")
def get_logs(session_id: Optional[str] = None):
    """Get logs for a session"""
    return logger.get_logs(session_id)

@router.get("/verify_task")
def verify_task(task_name: str, session_id: str):
    """Verify if a task has been completed"""
    logs = logger.get_logs(session_id)
    
    # Look for TASK_DONE events with matching task name
    for log in logs:
        if (log.get("action_type") == "TASK_DONE" and 
            log.get("payload", {}).get("taskName") == task_name):
            return {"success": True}
    
    return {"success": False}