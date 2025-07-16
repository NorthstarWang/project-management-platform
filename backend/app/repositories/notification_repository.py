from typing import Dict, Any, List
from .base_repository import BaseRepository

class NotificationRepository(BaseRepository):
    """Repository for notification data access"""
    
    def find_user_notifications(self, user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        notifications = self.find_by_field("recipient_id", user_id)
        if unread_only:
            notifications = [n for n in notifications if not n["read"]]
        return sorted(notifications, key=lambda x: x["created_at"], reverse=True)
    
    def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        notification = self.find_by_id(notification_id)
        if notification and notification["recipient_id"] == user_id:
            notification["read"] = True
            return True
        return False
    
    def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        count = 0
        for notification in self.data_store:
            if notification["recipient_id"] == user_id and not notification["read"]:
                notification["read"] = True
                count += 1
        return count
    
    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user"""
        return len([n for n in self.data_store 
                   if n["recipient_id"] == user_id and not n["read"]]) 