from fastapi import APIRouter, Request, Body, Query
from fastapi.responses import JSONResponse
import uuid
from typing import Any, Dict
from ..logger import logger
from ..state_manager import state_manager

router = APIRouter()

@router.post("/reset")
def reset_environment(seed: str = None):
    logger.clear_logs()
    state_manager.reset(seed)
    return {"status": "ok", "seed": seed}

@router.post("/new_session")
def new_session(seed: str = Query(None)):
    # 1) Generate
    session_id = str(uuid.uuid4())
    # 2) Clear logs & reset state
    logger.clear_logs()
    state_manager.reset(seed)
    # 3) Return + set cookie
    resp = JSONResponse({"session_id": session_id})
    resp.set_cookie(
        key="session_id",
        value=session_id,
        httponly=False,        # allow JS‐side reading
        samesite="Lax",
        max_age=60 * 60 * 24   # 1 day
    )
    return resp

@router.post("/log_event")
def log_event(request: Request, payload: Dict[str, Any] = Body(...)):
    session_id = request.query_params.get("session_id", "no_session")
    action_type = payload.get("actionType", "CUSTOM_EVENT")
    action_payload = payload.get("payload", {})
    logger.log_action(session_id, action_type, action_payload)
    return {"status": "logged"}

@router.post("/augment_state")
def augment_state(payload: Dict[str, Any] = Body(...)):
    state_manager.augment_state(payload)
    return {"status": "ok", "message": "State augmented with provided data."}

@router.post("/set_state")
def set_state(payload: Dict[str, Any] = Body(...)):
    state_manager.set_state(payload)
    return {"status": "ok", "message": "State has been overwritten."}

@router.get("/state")
def get_current_state():
    return state_manager.get_full_state()

@router.get("/logs")
def get_logs(session_id: str = None):
    return logger.get_logs(session_id)

@router.get("/verify_task")
def verify_task(task_name: str, session_id: str):
    logs = logger.get_logs(session_id)
    success = any(
        (log["action_type"] == "TASK_DONE") and (log["payload"].get("taskName") == task_name)
        for log in logs
    )
    return {"success": success}