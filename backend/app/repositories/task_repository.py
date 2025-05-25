from typing import Dict, Any, List, Optional
from .base_repository import BaseRepository

class TaskRepository(BaseRepository):
    """Repository for task data access"""
    
    def __init__(self, tasks_store: List[Dict[str, Any]], task_activities_store: List[Dict[str, Any]]):
        super().__init__(tasks_store)
        self.task_activities_store = task_activities_store
    
    def find_tasks_by_list(self, list_id: str) -> List[Dict[str, Any]]:
        """Find tasks in a list, sorted by position"""
        tasks = self.find_by_field("list_id", list_id)
        return sorted(tasks, key=lambda x: x.get("position", 0))
    
    def find_tasks_by_assignee(self, assignee_id: str) -> List[Dict[str, Any]]:
        """Find tasks assigned to a user"""
        return [t for t in self.data_store if t.get("assignee_id") == assignee_id]
    
    def find_active_tasks_by_assignee(self, assignee_id: str) -> List[Dict[str, Any]]:
        """Find non-archived tasks assigned to a user"""
        return [t for t in self.data_store 
                if t.get("assignee_id") == assignee_id and t.get("status") != "archived"]
    
    def search_tasks_in_board(self, board_lists: List[str], query: str) -> List[Dict[str, Any]]:
        """Search tasks within board lists"""
        tasks = [t for t in self.data_store if t["list_id"] in board_lists]
        query_lower = query.lower()
        return [task for task in tasks 
                if (query_lower in task["title"].lower() or 
                    query_lower in task.get("description", "").lower())]
    
    def move_task_to_list(self, task_id: str, new_list_id: str, position: Optional[int] = None) -> bool:
        """Move a task to a different list"""
        task = self.find_by_id(task_id)
        if not task:
            return False
        
        task["list_id"] = new_list_id
        if position is not None:
            task["position"] = position
        else:
            # Move to end of list
            existing_tasks = self.find_tasks_by_list(new_list_id)
            task["position"] = len(existing_tasks)
        
        return True
    
    def archive_task(self, task_id: str) -> bool:
        """Archive a task"""
        task = self.find_by_id(task_id)
        if task:
            task["status"] = "archived"
            task["archived_at"] = __import__('time').time()
            return True
        return False
    
    def unarchive_task(self, task_id: str) -> bool:
        """Unarchive a task"""
        task = self.find_by_id(task_id)
        if task and task.get("status") == "archived":
            task["status"] = "todo"
            if "archived_at" in task:
                del task["archived_at"]
            return True
        return False
    
    def create_activity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a task activity entry"""
        activity = {
            "id": str(__import__('uuid').uuid4()),
            "created_at": __import__('time').time(),
            **data
        }
        self.task_activities_store.append(activity)
        return activity
    
    def find_task_activities(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all activities for a task"""
        activities = [a for a in self.task_activities_store if a["task_id"] == task_id]
        return sorted(activities, key=lambda x: x["created_at"]) 