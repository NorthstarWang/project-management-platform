from fastapi import APIRouter, Request, HTTPException, Depends
from ..data_manager import data_manager
from .dependencies import get_current_user, log_action

router = APIRouter(prefix="/api", tags=["search"])

@router.get("/search")
def global_search(q: str, request: Request, current_user: dict = Depends(get_current_user)):
    """
    Global search across projects, boards, tasks, comments, and replies
    Respects user access permissions
    """
    if not q or len(q.strip()) < 2:
        return {
            "projects": [],
            "boards": [],
            "tasks": [],
            "comments": [],
            "total_count": 0
        }
    
    query = q.strip().lower()
    results = {
        "projects": [],
        "boards": [],
        "tasks": [],
        "comments": [],
        "total_count": 0
    }
    
    try:
        # Get user's accessible entities based on role
        if current_user["role"] == "admin":
            # Admins can see everything
            accessible_projects = data_manager.projects
            accessible_boards = data_manager.boards
        else:
            # Get projects and boards the user has access to
            user_projects = data_manager.project_service.get_user_projects(
                current_user["id"], current_user["role"]
            )
            accessible_project_ids = [p["id"] for p in user_projects]
            
            # Filter projects
            accessible_projects = [p for p in data_manager.projects if p["id"] in accessible_project_ids]
            
            # Filter boards - user must be enrolled or it's in their accessible projects
            user_board_ids = [bm["board_id"] for bm in data_manager.board_memberships 
                            if bm["user_id"] == current_user["id"]]
            project_board_ids = [b["id"] for b in data_manager.boards 
                               if b["project_id"] in accessible_project_ids]
            accessible_board_ids = list(set(user_board_ids + project_board_ids))
            accessible_boards = [b for b in data_manager.boards if b["id"] in accessible_board_ids]
        
        # Search projects
        for project in accessible_projects:
            if (query in project.get("name", "").lower() or 
                query in project.get("description", "").lower()):
                # Get team name for the project
                team = next((t for t in data_manager.teams if t["id"] == project.get("team_id")), None)
                results["projects"].append({
                    "id": project["id"],
                    "name": project["name"],
                    "description": project["description"],
                    "icon": project.get("icon", "folder"),
                    "team_name": team["name"] if team else None,
                    "type": "project"
                })
        
        # Search boards
        for board in accessible_boards:
            if (query in board.get("name", "").lower() or 
                query in board.get("description", "").lower()):
                # Get project info for the board
                project = next((p for p in data_manager.projects if p["id"] == board["project_id"]), None)
                results["boards"].append({
                    "id": board["id"],
                    "name": board["name"],
                    "description": board["description"],
                    "icon": board.get("icon", "kanban"),
                    "project_id": board["project_id"],
                    "project_name": project["name"] if project else None,
                    "type": "board"
                })
        
        # Search tasks (only in accessible boards)
        accessible_board_ids = [b["id"] for b in accessible_boards]
        accessible_list_ids = [l["id"] for l in data_manager.lists 
                              if l["board_id"] in accessible_board_ids]
        
        for task in data_manager.tasks:
            if (task["list_id"] in accessible_list_ids and
                task.get("status") not in ["archived", "deleted"] and
                not task.get("archived", False)):
                
                if (query in task.get("title", "").lower() or 
                    query in task.get("description", "").lower()):
                    # Get board and project info
                    task_list = next((l for l in data_manager.lists if l["id"] == task["list_id"]), None)
                    board = next((b for b in data_manager.boards if b["id"] == task_list["board_id"]), None) if task_list else None
                    project = next((p for p in data_manager.projects if p["id"] == board["project_id"]), None) if board else None
                    
                    # Get assignee info
                    assignee = None
                    if task.get("assignee_id"):
                        user = next((u for u in data_manager.users if u["id"] == task["assignee_id"]), None)
                        if user:
                            assignee = {
                                "id": user["id"],
                                "name": user["full_name"],
                                "username": user["username"]
                            }
                    
                    results["tasks"].append({
                        "id": task["id"],
                        "title": task["title"],
                        "description": task.get("description", ""),
                        "status": task["status"],
                        "priority": task.get("priority", "medium"),
                        "task_type": task.get("task_type", "task"),
                        "assignee": assignee,
                        "board_id": board["id"] if board else None,
                        "board_name": board["name"] if board else None,
                        "project_id": project["id"] if project else None,
                        "project_name": project["name"] if project else None,
                        "list_id": task["list_id"],
                        "type": "task"
                    })
        
        # Search comments (only for accessible tasks)
        accessible_task_ids = [t["id"] for t in results["tasks"]]
        
        for comment in data_manager.comments:
            if comment["task_id"] in accessible_task_ids:
                if query in comment.get("content", "").lower():
                    # Get task, board, and project info
                    task = next((t for t in data_manager.tasks if t["id"] == comment["task_id"]), None)
                    task_result = next((t for t in results["tasks"] if t["id"] == comment["task_id"]), None)
                    
                    # Get author info
                    author = next((u for u in data_manager.users if u["id"] == comment["author_id"]), None)
                    
                    result_comment = {
                        "id": comment["id"],
                        "content": comment["content"],
                        "author": {
                            "id": author["id"],
                            "name": author["full_name"],
                            "username": author["username"]
                        } if author else None,
                        "task_id": comment["task_id"],
                        "task_title": task["title"] if task else None,
                        "board_id": task_result["board_id"] if task_result else None,
                        "board_name": task_result["board_name"] if task_result else None,
                        "project_id": task_result["project_id"] if task_result else None,
                        "project_name": task_result["project_name"] if task_result else None,
                        "created_at": comment.get("created_at"),
                        "type": "comment"
                    }
                    
                    # Check if it's a reply
                    if comment.get("parent_comment_id"):
                        result_comment["type"] = "reply"
                        result_comment["parent_comment_id"] = comment["parent_comment_id"]
                    
                    results["comments"].append(result_comment)
        
        # Calculate total count
        results["total_count"] = (
            len(results["projects"]) +
            len(results["boards"]) +
            len(results["tasks"]) +
            len(results["comments"])
        )
        
        # Log search action
        log_action(request, "GLOBAL_SEARCH", {
            "text": f"User {current_user['full_name']} searched for {q}",
            "query": q,
            "userId": current_user["id"],
            "userRole": current_user["role"],
            "resultsCount": {
                "projects": len(results["projects"]),
                "boards": len(results["boards"]),
                "tasks": len(results["tasks"]),
                "comments": len(results["comments"]),
                "total": results["total_count"]
            }
        })
        
        return results
        
    except Exception as e:
        print(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Search failed")

# Keep the existing endpoints for backward compatibility
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
            "text": f"User {current_user['full_name']} searched for {q} in board {board_id}",
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
            "text": f"User {current_user['full_name']} searched for {q} in project {project_id}",
            "projectId": project_id,
            "query": q,
            "resultCount": len(tasks),
            "searchedBy": current_user["id"]
        })
        return tasks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) 