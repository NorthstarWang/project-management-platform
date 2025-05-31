from typing import Dict, Any, List, Optional
from ..repositories.task_repository import TaskRepository
from ..repositories.board_repository import BoardRepository
from ..repositories.user_repository import UserRepository
from ..repositories.project_repository import ProjectRepository

class TaskService:
    """Service for task-related business logic"""
    
    def __init__(self, task_repository: TaskRepository, board_repository: BoardRepository, 
                 user_repository: UserRepository, project_repository: ProjectRepository):
        self.task_repository = task_repository
        self.board_repository = board_repository
        self.user_repository = user_repository
        self.project_repository = project_repository
    
    def create_task(self, title: str, description: str, list_id: str, created_by: str,
                   assignee_id: Optional[str] = None, priority: str = "medium", 
                   due_date: Optional[str] = None, position: Optional[int] = None,
                   status: str = "todo", task_type: str = "task") -> Dict[str, Any]:
        """Create a new task"""
        # Verify list exists
        task_list = next((l for l in self.board_repository.lists_store if l["id"] == list_id), None)
        if not task_list:
            raise ValueError(f"List with ID '{list_id}' not found")
        
        # Verify assignee exists and is enrolled in board if provided
        if assignee_id:
            assignee = self.user_repository.find_by_id(assignee_id)
            if not assignee:
                raise ValueError(f"Assignee with ID '{assignee_id}' not found")
            
            # Check if assignee is enrolled in the board (skip for admin users)
            board_id = task_list["board_id"]
            if assignee["role"] != "admin" and not self.board_repository.is_user_enrolled_in_board(assignee_id, board_id):
                raise ValueError("Assignee is not enrolled in this board")
        
        # Calculate position if not provided
        if position is None:
            existing_tasks = self.task_repository.find_tasks_by_list(list_id)
            position = len(existing_tasks)
        
        task_data = {
            "title": title,
            "description": description,
            "list_id": list_id,
            "assignee_id": assignee_id,
            "priority": priority,
            "status": status,
            "task_type": task_type,
            "due_date": due_date,
            "position": position,
            "created_by": created_by
        }
        
        task = self.task_repository.create(task_data)
        
        # Create task creation activity
        self.create_task_activity(
            task_id=task["id"],
            user_id=created_by,
            activity_type="created",
            description=f"Created task '{task['title']}'"
        )
        
        return task
    
    def update_task(self, task_id: str, updates: Dict[str, Any], updated_by: str) -> Dict[str, Any]:
        """Update a task and track changes"""
        task = self.task_repository.find_by_id(task_id)
        if not task:
            raise ValueError(f"Task with ID '{task_id}' not found")
        
        # Store old values for activity tracking
        old_values = {}
        
        # Validate updates
        for field, value in updates.items():
            if field == "assignee_id" and value:
                # Verify assignee exists and is enrolled in board
                assignee = self.user_repository.find_by_id(value)
                if not assignee:
                    raise ValueError(f"Assignee with ID '{value}' not found")
                
                # Get board ID from task's list (skip enrollment check for admin users)
                task_list = next((l for l in self.board_repository.lists_store if l["id"] == task["list_id"]), None)
                if task_list and assignee["role"] != "admin" and not self.board_repository.is_user_enrolled_in_board(value, task_list["board_id"]):
                    raise ValueError("Assignee is not enrolled in this board")
            
            # Store old value
            old_values[field] = task.get(field)
        
        # Update task
        updated_task = self.task_repository.update_by_id(task_id, updates)
        
        # Create activities for significant changes
        for field, new_value in updates.items():
            old_value = old_values[field]
            if old_value != new_value:
                self._create_update_activity(task_id, updated_by, field, old_value, new_value)
        
        return updated_task
    
    def move_task(self, task_id: str, new_list_id: str, moved_by: str, position: Optional[int] = None) -> Dict[str, Any]:
        """Move a task to a different list"""
        task = self.task_repository.find_by_id(task_id)
        if not task:
            raise ValueError(f"Task with ID '{task_id}' not found")
        
        # Get old and new list names for activity
        old_list = next((l for l in self.board_repository.lists_store if l["id"] == task["list_id"]), None)
        new_list = next((l for l in self.board_repository.lists_store if l["id"] == new_list_id), None)
        
        if not new_list:
            raise ValueError(f"List with ID '{new_list_id}' not found")
        
        # Verify both lists are in the same board
        if old_list and old_list["board_id"] != new_list["board_id"]:
            raise ValueError("Cannot move task between different boards")
        
        # Move task
        success = self.task_repository.move_task_to_list(task_id, new_list_id, position)
        
        if success and old_list:
            # Create move activity
            self.create_task_activity(
                task_id=task_id,
                user_id=moved_by,
                activity_type="moved",
                description=f"Moved task from '{old_list['name']}' to '{new_list['name']}'",
                old_value=old_list["name"],
                new_value=new_list["name"]
            )
        
        if not success:
            raise ValueError("Failed to move task")
        
        # Return the updated task
        return self.task_repository.find_by_id(task_id)
    
    def archive_task(self, task_id: str, archived_by: str) -> Dict[str, Any]:
        """Archive a task"""
        success = self.task_repository.archive_task(task_id)
        if success:
            self.create_task_activity(
                task_id=task_id,
                user_id=archived_by,
                activity_type="archived",
                description="Archived task"
            )
            # Return the updated task
            return self.task_repository.find_by_id(task_id)
        else:
            raise ValueError(f"Task with ID '{task_id}' not found")
    
    def unarchive_task(self, task_id: str, unarchived_by: str) -> Dict[str, Any]:
        """Unarchive a task"""
        success = self.task_repository.unarchive_task(task_id)
        if success:
            self.create_task_activity(
                task_id=task_id,
                user_id=unarchived_by,
                activity_type="updated",
                description="Unarchived task"
            )
            # Return the updated task
            return self.task_repository.find_by_id(task_id)
        else:
            raise ValueError(f"Task with ID '{task_id}' not found")
    
    def delete_task(self, task_id: str, deleted_by: str) -> Dict[str, Any]:
        """Delete a task"""
        task = self.task_repository.find_by_id(task_id)
        if not task:
            raise ValueError(f"Task with ID '{task_id}' not found")
        
        # Store task data before deletion for return
        deleted_task = task.copy()
        
        # Create deletion activity before deleting
        self.create_task_activity(
            task_id=task_id,
            user_id=deleted_by,
            activity_type="deleted",
            description=f"Deleted task '{task['title']}'"
        )
        
        # Delete the task
        success = self.task_repository.delete_by_id(task_id)
        if not success:
            raise ValueError(f"Failed to delete task with ID '{task_id}'")
        
        # Return the deleted task data
        return deleted_task
    
    def get_task_with_details(self, task_id: str) -> Dict[str, Any]:
        """Get task with comments and activities"""
        task = self.task_repository.find_by_id(task_id)
        if not task:
            raise ValueError(f"Task with ID '{task_id}' not found")
        
        # Get task activities
        activities = self.task_repository.find_task_activities(task_id)
        
        # Enhance activities with user information
        enhanced_activities = []
        for activity in activities:
            user = self.user_repository.find_by_id(activity["user_id"])
            enhanced_activities.append({
                **activity,
                "user": user
            })
        
        return {
            **task,
            "activities": enhanced_activities
        }
    
    def get_user_assigned_tasks(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active tasks assigned to a user"""
        # Verify user exists
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        return self.task_repository.find_active_tasks_by_assignee(user_id)
    
    def search_tasks_in_board(self, board_id: str, query: str) -> List[Dict[str, Any]]:
        """Search tasks within a board"""
        # Verify board exists
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise ValueError(f"Board with ID '{board_id}' not found")
        
        # Get board lists
        board_lists = self.board_repository.find_board_lists(board_id)
        list_ids = [l["id"] for l in board_lists]
        
        return self.task_repository.search_tasks_in_board(list_ids, query)
    
    def search_tasks_in_project(self, project_id: str, query: str) -> List[Dict[str, Any]]:
        """Search tasks within a project"""
        # Verify project exists
        project = self.project_repository.find_by_id(project_id)
        if not project:
            raise ValueError(f"Project with ID '{project_id}' not found")
        
        # Get project boards
        project_boards = self.board_repository.find_boards_by_project(project_id)
        
        all_tasks = []
        for board in project_boards:
            board_tasks = self.search_tasks_in_board(board["id"], query)
            all_tasks.extend(board_tasks)
        
        return all_tasks
    
    def create_task_activity(self, task_id: str, user_id: str, activity_type: str, 
                           description: str, old_value: Optional[str] = None, 
                           new_value: Optional[str] = None) -> Dict[str, Any]:
        """Create a task activity entry"""
        activity_data = {
            "task_id": task_id,
            "user_id": user_id,
            "activity_type": activity_type,
            "description": description,
            "old_value": old_value,
            "new_value": new_value
        }
        return self.task_repository.create_activity(activity_data)
    
    def get_task_activities(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all activities for a task with user information"""
        activities = self.task_repository.find_task_activities(task_id)
        
        # Enhance with user information
        enhanced_activities = []
        for activity in activities:
            user = self.user_repository.find_by_id(activity["user_id"])
            enhanced_activities.append({
                **activity,
                "user": user
            })
        
        return enhanced_activities
    
    def _create_update_activity(self, task_id: str, user_id: str, field: str, old_value: Any, new_value: Any):
        """Create activity for task updates"""
        if field == "assignee_id":
            old_assignee = self.user_repository.find_by_id(old_value) if old_value else None
            new_assignee = self.user_repository.find_by_id(new_value) if new_value else None
            old_name = old_assignee["full_name"] if old_assignee else "Unassigned"
            new_name = new_assignee["full_name"] if new_assignee else "Unassigned"
            
            self.create_task_activity(
                task_id=task_id,
                user_id=user_id,
                activity_type="assigned",
                description=f"Changed assignee from {old_name} to {new_name}",
                old_value=old_name,
                new_value=new_name
            )
        elif field == "status":
            self.create_task_activity(
                task_id=task_id,
                user_id=user_id,
                activity_type="status_changed",
                description=f"Changed status from {old_value} to {new_value}",
                old_value=str(old_value),
                new_value=str(new_value)
            )
        elif field == "priority":
            self.create_task_activity(
                task_id=task_id,
                user_id=user_id,
                activity_type="priority_changed",
                description=f"Changed priority from {old_value} to {new_value}",
                old_value=str(old_value),
                new_value=str(new_value)
            )
        else:
            self.create_task_activity(
                task_id=task_id,
                user_id=user_id,
                activity_type="updated",
                description=f"Updated {field}",
                old_value=str(old_value) if old_value else None,
                new_value=str(new_value) if new_value else None
            ) 