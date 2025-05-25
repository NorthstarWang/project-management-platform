from typing import Dict, Any, List, Optional
from ..repositories.board_repository import BoardRepository
from ..repositories.project_repository import ProjectRepository
from ..repositories.user_repository import UserRepository

class BoardService:
    """Service for board and list-related business logic"""
    
    def __init__(self, board_repository: BoardRepository, project_repository: ProjectRepository, 
                 user_repository: UserRepository):
        self.board_repository = board_repository
        self.project_repository = project_repository
        self.user_repository = user_repository
    
    def create_board(self, name: str, description: str, project_id: str, created_by: str) -> Dict[str, Any]:
        """Create a new board"""
        # Verify project exists
        project = self.project_repository.find_by_id(project_id)
        if not project:
            raise ValueError(f"Project with ID '{project_id}' not found")
        
        board_data = {
            "name": name,
            "description": description,
            "project_id": project_id,
            "created_by": created_by
        }
        return self.board_repository.create(board_data)
    
    def get_project_boards(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all boards for a project"""
        return self.board_repository.find_boards_by_project(project_id)
    
    def get_board_with_details(self, board_id: str) -> Dict[str, Any]:
        """Get board with lists and basic info"""
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise ValueError(f"Board with ID '{board_id}' not found")
        
        # Get board lists
        lists = self.board_repository.find_board_lists(board_id)
        
        # Get board members
        member_ids = self.board_repository.find_board_members(board_id)
        members = []
        for member_id in member_ids:
            member = self.user_repository.find_by_id(member_id)
            if member:
                members.append(member)
        
        return {
            **board,
            "lists": lists,
            "members": members
        }
    
    def enroll_user_in_board(self, user_id: str, board_id: str, enrolled_by: str) -> Dict[str, Any]:
        """Enroll a user in a board"""
        # Verify user exists
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Verify board exists
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise ValueError(f"Board with ID '{board_id}' not found")
        
        return self.board_repository.enroll_user_in_board(user_id, board_id, enrolled_by)
    
    def remove_user_from_board(self, user_id: str, board_id: str) -> bool:
        """Remove a user from a board"""
        return self.board_repository.remove_user_from_board(user_id, board_id)
    
    def get_user_boards(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all boards a user is enrolled in"""
        return self.board_repository.find_user_boards(user_id)
    
    def get_board_members(self, board_id: str) -> List[Dict[str, Any]]:
        """Get all members of a board"""
        member_ids = self.board_repository.find_board_members(board_id)
        members = []
        for member_id in member_ids:
            member = self.user_repository.find_by_id(member_id)
            if member:
                members.append(member)
        return members
    
    def is_user_enrolled_in_board(self, user_id: str, board_id: str) -> bool:
        """Check if a user is enrolled in a board"""
        return self.board_repository.is_user_enrolled_in_board(user_id, board_id)
    
    def create_list(self, name: str, board_id: str, position: Optional[int] = None) -> Dict[str, Any]:
        """Create a new list in a board"""
        # Verify board exists
        board = self.board_repository.find_by_id(board_id)
        if not board:
            raise ValueError(f"Board with ID '{board_id}' not found")
        
        # Calculate position if not provided
        if position is None:
            existing_lists = self.board_repository.find_board_lists(board_id)
            position = len(existing_lists)
        
        list_data = {
            "name": name,
            "board_id": board_id,
            "position": position
        }
        return self.board_repository.create_list(list_data)
    
    def get_board_lists(self, board_id: str) -> List[Dict[str, Any]]:
        """Get all lists for a board"""
        return self.board_repository.find_board_lists(board_id)
    
    def check_user_board_access(self, user_id: str, board_id: str, user_role: str) -> bool:
        """Check if user has access to a board"""
        if user_role == "admin":
            return True
        
        # Check if user is enrolled in board
        if self.board_repository.is_user_enrolled_in_board(user_id, board_id):
            return True
        
        # Check if user is a manager assigned to the project
        if user_role == "manager":
            board = self.board_repository.find_by_id(board_id)
            if board:
                return self.project_repository.is_manager_assigned_to_project(user_id, board["project_id"])
        
        return False 