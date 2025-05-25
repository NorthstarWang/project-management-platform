from typing import Dict, Any, List, Optional
from .base_repository import BaseRepository

class BoardRepository(BaseRepository):
    """Repository for board data access"""
    
    def __init__(self, boards_store: List[Dict[str, Any]], lists_store: List[Dict[str, Any]], 
                 board_memberships_store: List[Dict[str, Any]]):
        super().__init__(boards_store)
        self.lists_store = lists_store
        self.board_memberships_store = board_memberships_store
    
    def find_boards_by_project(self, project_id: str) -> List[Dict[str, Any]]:
        """Find boards belonging to a project"""
        return self.find_by_field("project_id", project_id)
    
    def find_board_lists(self, board_id: str) -> List[Dict[str, Any]]:
        """Find lists in a board, sorted by position"""
        lists = [l for l in self.lists_store if l["board_id"] == board_id]
        return sorted(lists, key=lambda x: x.get("position", 0))
    
    def find_user_boards(self, user_id: str) -> List[Dict[str, Any]]:
        """Find boards a user is enrolled in"""
        user_board_ids = [bm["board_id"] for bm in self.board_memberships_store if bm["user_id"] == user_id]
        return [board for board in self.data_store if board["id"] in user_board_ids]
    
    def find_board_members(self, board_id: str) -> List[str]:
        """Find user IDs enrolled in a board"""
        return [bm["user_id"] for bm in self.board_memberships_store if bm["board_id"] == board_id]
    
    def is_user_enrolled_in_board(self, user_id: str, board_id: str) -> bool:
        """Check if a user is enrolled in a board"""
        return any(bm["user_id"] == user_id and bm["board_id"] == board_id 
                  for bm in self.board_memberships_store)
    
    def enroll_user_in_board(self, user_id: str, board_id: str, enrolled_by: str) -> Dict[str, Any]:
        """Enroll a user in a board"""
        # Check if already enrolled
        existing = next((bm for bm in self.board_memberships_store 
                        if bm["user_id"] == user_id and bm["board_id"] == board_id), None)
        if existing:
            return existing
        
        membership = {
            "id": str(__import__('uuid').uuid4()),
            "user_id": user_id,
            "board_id": board_id,
            "enrolled_by": enrolled_by,
            "enrolled_at": __import__('time').time()
        }
        self.board_memberships_store.append(membership)
        return membership
    
    def remove_user_from_board(self, user_id: str, board_id: str) -> bool:
        """Remove a user from a board"""
        original_length = len(self.board_memberships_store)
        self.board_memberships_store[:] = [bm for bm in self.board_memberships_store 
                                          if not (bm["user_id"] == user_id and bm["board_id"] == board_id)]
        return len(self.board_memberships_store) < original_length
    
    def create_list(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new list in a board"""
        list_item = {
            "id": str(__import__('uuid').uuid4()),
            "created_at": __import__('time').time(),
            **data
        }
        self.lists_store.append(list_item)
        return list_item 