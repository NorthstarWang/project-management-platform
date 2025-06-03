from typing import Dict, Any, List, Optional
from .repositories import (
    UserRepository, ProjectRepository, BoardRepository, 
    TaskRepository, NotificationRepository, CommentRepository, TeamRepository
)
from .services import (
    UserService, ProjectService, BoardService,
    TaskService, NotificationService, CommentService, TeamService
)

class DataManager:
    """Centralized data manager with repositories and services"""
    
    def __init__(self):
        # Data stores
        self.users: List[Dict[str, Any]] = []
        self.teams: List[Dict[str, Any]] = []
        self.projects: List[Dict[str, Any]] = []
        self.boards: List[Dict[str, Any]] = []
        self.lists: List[Dict[str, Any]] = []
        self.tasks: List[Dict[str, Any]] = []
        self.comments: List[Dict[str, Any]] = []
        self.team_memberships: List[Dict[str, Any]] = []
        self.board_memberships: List[Dict[str, Any]] = []
        self.project_assignments: List[Dict[str, Any]] = []
        self.notifications: List[Dict[str, Any]] = []
        self.task_activities: List[Dict[str, Any]] = []
        self.board_statuses: List[Dict[str, Any]] = []
        self.team_join_requests: List[Dict[str, Any]] = []
        self.team_invitations: List[Dict[str, Any]] = []
        
        # Initialize repositories
        self.user_repository = UserRepository(self.users)
        self.project_repository = ProjectRepository(
            self.projects, self.teams, self.team_memberships, self.project_assignments
        )
        self.board_repository = BoardRepository(
            self.boards, self.lists, self.board_memberships, self.board_statuses
        )
        self.task_repository = TaskRepository(self.tasks, self.task_activities)
        self.notification_repository = NotificationRepository(self.notifications)
        self.comment_repository = CommentRepository(self.comments)
        self.team_repository = TeamRepository(
            self.teams, self.team_memberships, self.team_join_requests, self.team_invitations
        )
        
        # Initialize services
        self.user_service = UserService(self.user_repository, self.team_repository)
        self.project_service = ProjectService(self.project_repository, self.user_repository)
        self.board_service = BoardService(
            self.board_repository, self.project_repository, self.user_repository, self.task_repository
        )
        self.task_service = TaskService(
            self.task_repository, self.board_repository, self.user_repository, self.project_repository
        )
        self.notification_service = NotificationService(
            self.notification_repository, self.user_repository
        )
        self.comment_service = CommentService(
            self.comment_repository, self.task_repository, self.user_repository
        )
        self.team_service = TeamService(
            self.team_repository, self.user_repository, self.notification_repository
        )
    
    def reset(self, seed: Optional[str] = None):
        """Reset all data and generate mock data"""
        # Clear all data stores
        for attr_name in dir(self):
            attr = getattr(self, attr_name)
            if isinstance(attr, list) and not attr_name.startswith('_'):
                attr.clear()
        
        # Generate mock data
        from .utils.mock_data_generator import generate_mock_data
        generate_mock_data(self, seed)
    
    def get_full_state(self) -> Dict[str, Any]:
        """Return complete state"""
        return {
            "users": self.users,
            "teams": self.teams,
            "projects": self.projects,
            "boards": self.boards,
            "lists": self.lists,
            "tasks": self.tasks,
            "comments": self.comments,
            "team_memberships": self.team_memberships,
            "board_memberships": self.board_memberships,
            "project_assignments": self.project_assignments,
            "notifications": self.notifications,
            "task_activities": self.task_activities,
            "board_statuses": self.board_statuses,
            "team_join_requests": self.team_join_requests,
            "team_invitations": self.team_invitations
        }
    
    def augment_state(self, data: Dict[str, Any]):
        """Add or extend data in the current state"""
        for key, value in data.items():
            if hasattr(self, key) and isinstance(getattr(self, key), list) and isinstance(value, list):
                getattr(self, key).extend(value)
    
    def set_state(self, data: Dict[str, Any]):
        """Replace entire state with provided data"""
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)

# Global instance
data_manager = DataManager() 