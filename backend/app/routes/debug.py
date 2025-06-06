from fastapi import APIRouter, Request
from ..data_manager import data_manager
from ..utils.mock_data_generator import generate_mock_data
from .dependencies import log_action

router = APIRouter(prefix="/api/debug", tags=["debug"])

@router.post("/regenerate-mock-data")
def regenerate_mock_data(request: Request):
    """Regenerate mock data with fixed notification access"""
    try:
        # Clear existing data
        data_manager.users.clear()
        data_manager.teams.clear()
        data_manager.team_memberships.clear()
        data_manager.projects.clear()
        data_manager.project_assignments.clear()
        data_manager.boards.clear()
        data_manager.lists.clear()
        data_manager.board_memberships.clear()
        data_manager.tasks.clear()
        data_manager.task_activities.clear()
        data_manager.comments.clear()
        data_manager.notifications.clear()
        
        # Regenerate with fixed notification logic
        generate_mock_data(data_manager, seed="fixed-notifications")
        
        # Count generated data
        counts = {
            "users": len(data_manager.users),
            "teams": len(data_manager.teams),
            "projects": len(data_manager.projects),
            "boards": len(data_manager.boards),
            "tasks": len(data_manager.tasks),
            "notifications": len(data_manager.notifications),
            "board_memberships": len(data_manager.board_memberships)
        }
        
        log_action(request, "MOCK_DATA_REGENERATED", {
            "text": "Mock data regenerated with fixed notification access",
            "counts": counts
        })
        
        return {
            "status": "success",
            "message": "Mock data regenerated with fixed notification access",
            "counts": counts
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Failed to regenerate mock data: {str(e)}"
        } 