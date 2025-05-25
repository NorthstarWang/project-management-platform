from typing import Dict, Any, List, Optional
from .base_repository import BaseRepository

class UserRepository(BaseRepository):
    """Repository for user data access"""
    
    def find_by_username_and_password(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Find user by username and password for authentication"""
        return next((user for user in self.data_store 
                    if user["username"] == username and user["password"] == password), None)
    
    def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Find user by username"""
        return next((user for user in self.data_store if user["username"] == username), None)
    
    def find_by_role(self, role: str) -> List[Dict[str, Any]]:
        """Find users by role"""
        return self.find_by_field("role", role)
    
    def find_by_team(self, team_memberships: List[Dict[str, Any]], team_id: str) -> List[Dict[str, Any]]:
        """Find users who are members of a specific team"""
        member_ids = [tm["user_id"] for tm in team_memberships if tm["team_id"] == team_id]
        return [user for user in self.data_store if user["id"] in member_ids] 