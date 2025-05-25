from typing import Dict, Any, List, Optional
from ..repositories.comment_repository import CommentRepository
from ..repositories.task_repository import TaskRepository
from ..repositories.user_repository import UserRepository

class CommentService:
    """Service for comment-related business logic"""
    
    def __init__(self, comment_repository: CommentRepository, task_repository: TaskRepository, 
                 user_repository: UserRepository):
        self.comment_repository = comment_repository
        self.task_repository = task_repository
        self.user_repository = user_repository
    
    def create_comment(self, content: str, task_id: str, author_id: str, 
                      parent_comment_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new comment or reply"""
        # Verify task exists
        task = self.task_repository.find_by_id(task_id)
        if not task:
            raise ValueError(f"Task with ID '{task_id}' not found")
        
        # Verify author exists
        author = self.user_repository.find_by_id(author_id)
        if not author:
            raise ValueError(f"Author with ID '{author_id}' not found")
        
        # Verify parent comment exists if provided
        if parent_comment_id:
            parent_comment = self.comment_repository.find_by_id(parent_comment_id)
            if not parent_comment:
                raise ValueError(f"Parent comment with ID '{parent_comment_id}' not found")
            
            # Ensure parent comment belongs to the same task
            if parent_comment["task_id"] != task_id:
                raise ValueError("Parent comment must belong to the same task")
        
        comment_data = {
            "content": content,
            "task_id": task_id,
            "author_id": author_id,
            "parent_comment_id": parent_comment_id
        }
        
        comment = self.comment_repository.create(comment_data)
        
        # Create task activity for comment
        self.task_repository.create_activity({
            "task_id": task_id,
            "user_id": author_id,
            "activity_type": "commented",
            "description": f"Added a comment: {content[:50]}{'...' if len(content) > 50 else ''}"
        })
        
        return comment
    
    def get_task_comments(self, task_id: str) -> List[Dict[str, Any]]:
        """Get all comments for a task with author information"""
        comments = self.comment_repository.find_task_comments(task_id)
        
        # Enhance comments with author information
        enhanced_comments = []
        for comment in comments:
            author = self.user_repository.find_by_id(comment["author_id"])
            enhanced_comments.append({
                **comment,
                "author": author
            })
        
        return enhanced_comments
    
    def get_task_comments_threaded(self, task_id: str) -> List[Dict[str, Any]]:
        """Get comments for a task organized in threaded structure"""
        # Get top-level comments
        top_level_comments = self.comment_repository.find_top_level_comments(task_id)
        
        # Enhance with author info and replies
        threaded_comments = []
        for comment in top_level_comments:
            author = self.user_repository.find_by_id(comment["author_id"])
            
            # Get replies for this comment
            replies = self.comment_repository.find_comment_replies(comment["id"])
            enhanced_replies = []
            for reply in replies:
                reply_author = self.user_repository.find_by_id(reply["author_id"])
                enhanced_replies.append({
                    **reply,
                    "author": reply_author
                })
            
            threaded_comments.append({
                **comment,
                "author": author,
                "replies": enhanced_replies
            })
        
        return threaded_comments
    
    def get_task_comments_with_replies(self, task_id: str) -> List[Dict[str, Any]]:
        """Get comments for a task with replies.
        
        This method is an alias for `get_task_comments_threaded` and provides the same functionality.
        It is included for consistency and to support alternative naming conventions.
        """
        return self.get_task_comments_threaded(task_id)
    
    def get_comment_replies(self, parent_comment_id: str) -> List[Dict[str, Any]]:
        """Get all replies to a specific comment"""
        replies = self.comment_repository.find_comment_replies(parent_comment_id)
        
        # Enhance with author information
        enhanced_replies = []
        for reply in replies:
            author = self.user_repository.find_by_id(reply["author_id"])
            enhanced_replies.append({
                **reply,
                "author": author
            })
        
        return enhanced_replies
    
    def update_comment(self, comment_id: str, content: str, author_id: str) -> Dict[str, Any]:
        """Update a comment (only by the original author)"""
        comment = self.comment_repository.find_by_id(comment_id)
        if not comment:
            raise ValueError(f"Comment with ID '{comment_id}' not found")
        
        # Verify the user is the original author
        if comment["author_id"] != author_id:
            raise ValueError("Only the original author can edit this comment")
        
        updated_comment = self.comment_repository.update_by_id(comment_id, {"content": content})
        
        # Create task activity for comment edit
        self.task_repository.create_activity({
            "task_id": comment["task_id"],
            "user_id": author_id,
            "activity_type": "updated",
            "description": f"Edited a comment"
        })
        
        return updated_comment
    
    def delete_comment(self, comment_id: str, user_id: str, user_role: str) -> bool:
        """Delete a comment (by author or admin)"""
        comment = self.comment_repository.find_by_id(comment_id)
        if not comment:
            raise ValueError(f"Comment with ID '{comment_id}' not found")
        
        # Check permissions - author or admin can delete
        if comment["author_id"] != user_id and user_role != "admin":
            raise ValueError("Only the author or admin can delete this comment")
        
        # Delete the comment and any replies
        success = self.comment_repository.delete_by_id(comment_id)
        
        if success:
            # Also delete any replies to this comment
            replies = self.comment_repository.find_comment_replies(comment_id)
            for reply in replies:
                self.comment_repository.delete_by_id(reply["id"])
            
            # Create task activity for comment deletion
            self.task_repository.create_activity({
                "task_id": comment["task_id"],
                "user_id": user_id,
                "activity_type": "updated",
                "description": f"Deleted a comment"
            })
        
        return success 