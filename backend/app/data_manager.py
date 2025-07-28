from typing import Dict, Any, List, Optional
from .repositories import (
    UserRepository, ProjectRepository, BoardRepository, 
    TaskRepository, NotificationRepository, CommentRepository, TeamRepository, MessageRepository
)
from .repositories.custom_field_repository import CustomFieldRepository
from .repositories.time_tracking_repository import TimeTrackingRepository
from .repositories.dependency_repository import DependencyRepository
from .repositories.permission_repository import PermissionRepository
from .repositories.audit_repository import AuditRepository
from .services import (
    UserService, ProjectService, BoardService,
    TaskService, NotificationService, CommentService, TeamService, MessageService
)
from .services.custom_field_service import CustomFieldService
from .services.time_tracking_service import TimeTrackingService
from .services.dependency_service import DependencyService
from .services.permission_service import PermissionService
from .services.audit_service import AuditService

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
        self.permission_repository = PermissionRepository()
        self.audit_repository = AuditRepository()
        
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
        self.permission_service = PermissionService(self.permission_repository)
        self.audit_service = AuditService(self.audit_repository, self.user_repository)
    
    def reset(self, seed: Optional[str] = None):
        """Reset all data and generate mock data"""
        # Clear all data stores
        for attr_name in dir(self):
            attr = getattr(self, attr_name)
            if isinstance(attr, list) and not attr_name.startswith('_'):
                attr.clear()
        
        # Clear repository dictionaries
        self.custom_field_repository.custom_field_definitions.clear()
        self.custom_field_repository.custom_field_values.clear()
        self.custom_field_repository.field_templates.clear()
        self.custom_field_repository.custom_field_filters.clear()
        self.custom_field_repository.custom_field_history.clear()
        
        self.time_tracking_repository.time_entries.clear()
        self.time_tracking_repository.timers.clear()
        self.time_tracking_repository.task_estimates.clear()
        self.time_tracking_repository.task_progress.clear()
        self.time_tracking_repository.work_patterns.clear()
        self.time_tracking_repository.sprint_burndowns.clear()
        self.time_tracking_repository.team_velocities.clear()
        self.time_tracking_repository.time_tracking_alerts.clear()
        self.time_tracking_repository.timesheets.clear()
        self.time_tracking_repository.project_timebudgets.clear()
        self.time_tracking_repository.capacity_plans.clear()
        self.time_tracking_repository.time_tracking_reports.clear()
        self.time_tracking_repository.time_tracking_settings.clear()
        
        self.dependency_repository.task_dependencies.clear()
        self.dependency_repository.workflow_templates.clear()
        self.dependency_repository.workflow_instances.clear()
        self.dependency_repository.workflow_steps.clear()
        self.dependency_repository.step_executions.clear()
        
        self.permission_repository.permissions.clear()
        self.permission_repository.permission_rules.clear()
        self.permission_repository.roles.clear()
        self.permission_repository.role_assignments.clear()
        self.permission_repository.permission_grants.clear()
        self.permission_repository.permission_templates.clear()
        self.permission_repository.permission_policies.clear()
        
        self.audit_repository.audit_entries.clear()
        self.audit_repository.audit_sessions.clear()
        self.audit_repository.audit_reports.clear()
        self.audit_repository.compliance_requirements.clear()
        self.audit_repository.audit_policies.clear()
        self.audit_repository.audit_alerts.clear()
        self.audit_repository.retention_policies.clear()
        self.audit_repository.audit_integrations.clear()
        
        # Re-initialize permission repository to set up default permissions and roles
        self.permission_repository._initialize_system_permissions()
        self.permission_repository._initialize_system_roles()
        
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
            "time_tracking_settings": list(self.time_tracking_repository.time_tracking_settings.values()),
            "dependencies": list(self.dependency_repository.dependencies.values()),
            "workflows": list(self.dependency_repository.workflows.values()),
            "dependency_templates": list(self.dependency_repository.dependency_templates.values()),
            "permissions": list(self.permission_repository.permissions.values()),
            "permission_rules": list(self.permission_repository.permission_rules.values()),
            "roles": list(self.permission_repository.roles.values()),
            "role_assignments": list(self.permission_repository.role_assignments.values()),
            "permission_grants": list(self.permission_repository.permission_grants.values()),
            "permission_templates": list(self.permission_repository.permission_templates.values()),
            "permission_policies": list(self.permission_repository.permission_policies.values()),
            "audit_entries": list(self.audit_repository.audit_entries.values()),
            "audit_sessions": list(self.audit_repository.audit_sessions.values()),
            "audit_reports": list(self.audit_repository.audit_reports.values()),
            "compliance_requirements": list(self.audit_repository.compliance_requirements.values()),
            "audit_policies": list(self.audit_repository.audit_policies.values()),
            "audit_alerts": list(self.audit_repository.audit_alerts.values()),
            "retention_policies": list(self.audit_repository.retention_policies.values()),
            "audit_integrations": list(self.audit_repository.audit_integrations.values())
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