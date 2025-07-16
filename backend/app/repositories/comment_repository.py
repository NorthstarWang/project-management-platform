from typing import Dict, Any, List
from .base_repository import BaseRepository

class CommentRepository(BaseRepository):
    """Repository for comment data access"""
    
    def find_task_comments(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all comments for a task, sorted by creation time"""
        comments = self.find_by_field("task_id", task_id)
        return sorted(comments, key=lambda x: x["created_at"])
    
    def find_top_level_comments(self, task_id: str) -> List[Dict[str, Any]]:
        """Get top-level comments (no parent) for a task"""
        comments = [c for c in self.data_store 
                   if c["task_id"] == task_id and c.get("parent_comment_id") is None]
        return sorted(comments, key=lambda x: x["created_at"])
    
    def find_comment_replies(self, parent_comment_id: str) -> List[Dict[str, Any]]:
        """Get replies to a specific comment"""
        replies = self.find_by_field("parent_comment_id", parent_comment_id)
        return sorted(replies, key=lambda x: x["created_at"]) 