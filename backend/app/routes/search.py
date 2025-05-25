from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["search"])

@router.get("/boards/{board_id}/search")
def search_board_tasks(board_id: str, q: str, request: Request, 
                      current_user: dict = Depends(get_current_user)):
    """Search tasks within a board"""
    try:
        # Check board access
        if not data_manager.board_service.check_user_board_access(current_user["id"], board_id, current_user["role"]):
            raise HTTPException(status_code=403, detail="Access denied to this board")
        
        tasks = data_manager.task_service.search_tasks_in_board(board_id, q)
        log_action(request, "BOARD_SEARCH", {
            "boardId": board_id,
            "query": q,
            "resultCount": len(tasks),
            "searchedBy": current_user["id"]
        })
        return tasks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/projects/{project_id}/search")
def search_project_tasks(project_id: str, q: str, request: Request,
                        current_user: dict = Depends(get_current_user)):
    """Search tasks within a project"""
    try:
        # Check project access
        user_projects = data_manager.project_service.get_user_projects(current_user["id"], current_user["role"])
        user_project_ids = [p["id"] for p in user_projects]
        
        if project_id not in user_project_ids:
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        tasks = data_manager.task_service.search_tasks_in_project(project_id, q)
        log_action(request, "PROJECT_SEARCH", {
            "projectId": project_id,
            "query": q,
            "resultCount": len(tasks),
            "searchedBy": current_user["id"]
        })
        return tasks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) 