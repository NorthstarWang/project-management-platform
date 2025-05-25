from typing import Dict, Any, List, Optional
from ..repositories.notification_repository import NotificationRepository
from ..repositories.user_repository import UserRepository

class NotificationService:
    """Service for notification-related business logic"""
    
    def __init__(self, notification_repository: NotificationRepository, user_repository: UserRepository):
        self.notification_repository = notification_repository
        self.user_repository = user_repository
    
    def create_notification(self, recipient_id: str, notification_type: str, title: str, 
                          message: str, related_task_id: Optional[str] = None,
                          related_board_id: Optional[str] = None, 
                          related_project_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new notification"""
        # Verify recipient exists
        recipient = self.user_repository.find_by_id(recipient_id)
        if not recipient:
            raise ValueError(f"Recipient with ID '{recipient_id}' not found")
        
        notification_data = {
            "recipient_id": recipient_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "related_task_id": related_task_id,
            "related_board_id": related_board_id,
            "related_project_id": related_project_id,
            "read": False
        }
        return self.notification_repository.create(notification_data)
    
    def get_user_notifications(self, user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        return self.notification_repository.find_user_notifications(user_id, unread_only)
    
    def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        return self.notification_repository.mark_notification_read(notification_id, user_id)
    
    def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        return self.notification_repository.mark_all_notifications_read(user_id)
    
    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user"""
        return self.notification_repository.get_unread_count(user_id)
    
    def create_task_assigned_notification(self, assignee_id: str, task_title: str, 
                                        assigned_by_name: str, task_id: str) -> Optional[Dict[str, Any]]:
        """Create notification when a task is assigned"""
        if not assignee_id:
            return None
        
        return self.create_notification(
            recipient_id=assignee_id,
            notification_type="task_assigned",
            title="Task Assigned",
            message=f"You have been assigned to task '{task_title}' by {assigned_by_name}",
            related_task_id=task_id
        )
    
    def create_task_updated_notification(self, assignee_id: str, task_title: str, 
                                       updated_by_name: str, task_id: str) -> Optional[Dict[str, Any]]:
        """Create notification when a task is updated"""
        if not assignee_id:
            return None
        
        return self.create_notification(
            recipient_id=assignee_id,
            notification_type="task_updated",
            title="Task Updated",
            message=f"Task '{task_title}' has been updated by {updated_by_name}",
            related_task_id=task_id
        )
    
    def create_task_commented_notification(self, assignee_id: str, task_title: str, 
                                         commenter_name: str, task_id: str) -> Optional[Dict[str, Any]]:
        """Create notification when a task is commented on"""
        if not assignee_id:
            return None
        
        return self.create_notification(
            recipient_id=assignee_id,
            notification_type="task_commented",
            title="New Comment",
            message=f"{commenter_name} commented on task '{task_title}'",
            related_task_id=task_id
        )
    
    def create_task_moved_notification(self, assignee_id: str, task_title: str, 
                                     moved_by_name: str, from_list: str, to_list: str, 
                                     task_id: str) -> Optional[Dict[str, Any]]:
        """Create notification when a task is moved"""
        if not assignee_id:
            return None
        
        return self.create_notification(
            recipient_id=assignee_id,
            notification_type="task_moved",
            title="Task Moved",
            message=f"Task '{task_title}' was moved from '{from_list}' to '{to_list}' by {moved_by_name}",
            related_task_id=task_id
        )
    
    def create_board_enrolled_notification(self, user_id: str, board_name: str, 
                                         enrolled_by_name: str, board_id: str) -> Dict[str, Any]:
        """Create notification when a user is enrolled in a board"""
        return self.create_notification(
            recipient_id=user_id,
            notification_type="board_enrolled",
            title="Board Access Granted",
            message=f"You have been enrolled in board '{board_name}' by {enrolled_by_name}",
            related_board_id=board_id
        )
    
    def create_project_assigned_notification(self, manager_id: str, project_name: str, 
                                           assigned_by_name: str, project_id: str) -> Dict[str, Any]:
        """Create notification when a manager is assigned to a project"""
        return self.create_notification(
            recipient_id=manager_id,
            notification_type="project_assigned",
            title="Project Assigned",
            message=f"You have been assigned to manage project '{project_name}' by {assigned_by_name}",
            related_project_id=project_id
        ) 