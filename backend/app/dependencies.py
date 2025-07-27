"""
Application-wide dependencies
"""
from fastapi import Depends, Request
from .data_manager import data_manager


def get_data_manager():
    """Get the data manager instance"""
    return data_manager


def track_event(request: Request):
    """Track event using logger"""
    from .logger import logger
    
    def _track(action_type: str, payload: dict):
        session_id = request.query_params.get("session_id")
        if session_id:
            logger.log_action(session_id, action_type, payload)
    
    return _track