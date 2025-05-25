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