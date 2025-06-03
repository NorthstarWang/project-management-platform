from typing import Dict, Any, List, Optional
from ..repositories.user_repository import UserRepository

class UserService:
    """Service for user-related business logic"""
    
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate a user with username and password"""
        return self.user_repository.find_by_username_and_password(username, password)
    
    def create_user(self, username: str, password: str, email: str = "", 
                   full_name: str = "", role: str = "member") -> Dict[str, Any]:
        """Create a new user"""
        # Check if username already exists
        existing_user = self.user_repository.find_by_username(username)
        if existing_user:
            raise ValueError(f"Username '{username}' already exists")
        
        user_data = {
            "username": username,
            "password": password,
            "email": email,
            "full_name": full_name,
            "role": role
        }
        return self.user_repository.create(user_data)
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.user_repository.find_by_id(user_id)
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users"""
        return self.user_repository.find_all()
    
    def get_users_by_role(self, role: str) -> List[Dict[str, Any]]:
        """Get users by role"""
        return self.user_repository.find_by_role(role)
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed user profile information"""
        user = self.user_repository.find_by_id(user_id)
        if not user:
            return None
            
        # Return user data with profile fields, setting defaults for missing fields
        profile = user.copy()
        profile.setdefault('bio', '')
        profile.setdefault('department', '')
        profile.setdefault('location', '')
        profile.setdefault('phone', '')
        profile.setdefault('created_at', None)
        profile.setdefault('last_login', None)
        
        return profile
    
    def update_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile information"""
        existing_user = self.user_repository.find_by_id(user_id)
        if not existing_user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Prepare update data, only including non-None values
        update_data = {}
        for key, value in profile_data.items():
            if value is not None:
                update_data[key] = value
        
        # Update the user using the correct method name
        updated_user = self.user_repository.update_by_id(user_id, update_data)
        if not updated_user:
            raise ValueError(f"Failed to update user with ID '{user_id}'")
        
        return updated_user
    
    def get_user_statistics(self, user_id: str) -> Dict[str, int]:
        """Get user activity statistics"""
        # This would typically query other services/repositories for real stats
        # For now, returning mock data
        return {
            "projects_created": 0,
            "tasks_completed": 0,
            "comments_made": 0
        } 