from typing import Dict, Any, List, Optional
from .repositories import (
    UserRepository, ProjectRepository, BoardRepository, 
    TaskRepository, NotificationRepository, CommentRepository, TeamRepository, MessageRepository
)
from .repositories.custom_field_repository import CustomFieldRepository
from .repositories.time_tracking_repository import TimeTrackingRepository
from .repositories.dependency_repository import DependencyRepository
from .services import (
    UserService, ProjectService, BoardService,
    TaskService, NotificationService, CommentService, TeamService, MessageService
)
from .services.custom_field_service import CustomFieldService
from .services.time_tracking_service import TimeTrackingService
from .services.dependency_service import DependencyService

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
        self.team_creation_requests: List[Dict[str, Any]] = []
        
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
        self.message_repository = MessageRepository()
        self.custom_field_repository = CustomFieldRepository()
        self.time_tracking_repository = TimeTrackingRepository()
        self.dependency_repository = DependencyRepository()
        
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
        # Initialize message service with dependencies
        self.message_service = MessageService(
            self.message_repository,
            self.user_service,
            self.team_service,
            self.notification_service
        )
        self.custom_field_service = CustomFieldService()
        self.time_tracking_service = TimeTrackingService(
            self.time_tracking_repository,
            self.user_repository,
            self.task_repository,
            self.project_repository
        )
        self.dependency_service = DependencyService(
            self.dependency_repository,
            self.task_repository,
            self.project_repository,
            self.board_repository
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
            "team_invitations": self.team_invitations,
            "team_creation_requests": self.team_creation_requests,
            "custom_field_definitions": list(self.custom_field_repository.custom_field_definitions.values()),
            "custom_field_values": list(self.custom_field_repository.custom_field_values.values()),
            "field_templates": list(self.custom_field_repository.field_templates.values()),
            "custom_field_filters": list(self.custom_field_repository.custom_field_filters.values()),
            "custom_field_history": self.custom_field_repository.custom_field_history,
            "time_entries": list(self.time_tracking_repository.time_entries.values()),
            "timers": list(self.time_tracking_repository.timers.values()),
            "task_estimates": list(self.time_tracking_repository.task_estimates.values()),
            "task_progress": list(self.time_tracking_repository.task_progress.values()),
            "work_patterns": list(self.time_tracking_repository.work_patterns.values()),
            "sprint_burndowns": list(self.time_tracking_repository.sprint_burndowns.values()),
            "team_velocities": list(self.time_tracking_repository.team_velocities.values()),
            "time_tracking_alerts": list(self.time_tracking_repository.time_tracking_alerts.values()),
            "timesheets": list(self.time_tracking_repository.timesheets.values()),
            "project_timebudgets": list(self.time_tracking_repository.project_timebudgets.values()),
            "capacity_plans": list(self.time_tracking_repository.capacity_plans.values()),
            "time_tracking_reports": list(self.time_tracking_repository.time_tracking_reports.values()),
            "time_tracking_settings": list(self.time_tracking_repository.time_tracking_settings.values())
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