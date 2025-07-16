from typing import Dict, Any, List
from ..repositories.project_repository import ProjectRepository
from ..repositories.user_repository import UserRepository

class ProjectService:
    """Service for project and team-related business logic"""
    
    def __init__(self, project_repository: ProjectRepository, user_repository: UserRepository):
        self.project_repository = project_repository
        self.user_repository = user_repository
    
    def create_project(self, name: str, description: str, team_id: str, created_by: str, icon: str = "folder") -> Dict[str, Any]:
        """Create a new project"""
        # Verify team exists
        team = next((t for t in self.project_repository.teams_store if t["id"] == team_id), None)
        if not team:
            raise ValueError(f"Team with ID '{team_id}' not found")
        
        project_data = {
            "name": name,
            "description": description,
            "team_id": team_id,
            "created_by": created_by,
            "icon": icon
        }
        project = self.project_repository.create(project_data)
        
        # Auto-assign the project creator as manager if they have manager role
        creator = self.user_repository.find_by_id(created_by)
        if creator and creator["role"] == "manager":
            self.project_repository.assign_project_to_manager(project["id"], created_by, created_by)
        
        return project
    
    def get_user_projects(self, user_id: str, user_role: str) -> List[Dict[str, Any]]:
        """Get projects accessible to a user based on their role"""
        if user_role == "admin":
            return self.project_repository.find_all()
        
        # Get user's teams
        user_teams = self.project_repository.find_user_teams(user_id)
        user_team_ids = [team["id"] for team in user_teams]
        
        # Get projects for user's teams
        accessible_projects = []
        for team_id in user_team_ids:
            team_projects = self.project_repository.find_projects_by_team(team_id)
            accessible_projects.extend(team_projects)
        
        # Also include projects assigned to user as manager
        if user_role == "manager":
            manager_projects = self.project_repository.find_manager_projects(user_id)
            accessible_projects.extend(manager_projects)
        
        # Remove duplicates
        seen_ids = set()
        unique_projects = []
        for project in accessible_projects:
            if project["id"] not in seen_ids:
                seen_ids.add(project["id"])
                unique_projects.append(project)
        
        return unique_projects
    
    def assign_manager_to_project(self, project_id: str, manager_id: str, assigned_by: str) -> Dict[str, Any]:
        """Assign a manager to a project"""
        # Verify project exists
        project = self.project_repository.find_by_id(project_id)
        if not project:
            raise ValueError(f"Project with ID '{project_id}' not found")
        
        # Verify manager exists and has manager role
        manager = self.user_repository.find_by_id(manager_id)
        if not manager:
            raise ValueError(f"Manager with ID '{manager_id}' not found")
        
        if manager["role"] not in ["manager", "admin"]:
            raise ValueError("User must have manager or admin role")
        
        return self.project_repository.assign_project_to_manager(project_id, manager_id, assigned_by)
    
    def get_project_managers(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all managers assigned to a project"""
        manager_ids = self.project_repository.find_project_managers(project_id)
        managers = []
        for manager_id in manager_ids:
            manager = self.user_repository.find_by_id(manager_id)
            if manager:
                managers.append(manager)
        return managers
    
    def create_team(self, name: str, description: str = "") -> Dict[str, Any]:
        """Create a new team"""
        team_data = {
            "name": name,
            "description": description
        }
        return self.project_repository.create_team(team_data)
    
    def get_user_teams(self, user_id: str) -> List[Dict[str, Any]]:
        """Get teams a user belongs to"""
        return self.project_repository.find_user_teams(user_id)
    
    def add_user_to_team(self, user_id: str, team_id: str, role: str = "member") -> Dict[str, Any]:
        """Add a user to a team"""
        # Verify user exists
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Verify team exists
        team = next((t for t in self.project_repository.teams_store if t["id"] == team_id), None)
        if not team:
            raise ValueError(f"Team with ID '{team_id}' not found")
        
        return self.project_repository.add_user_to_team(user_id, team_id, role) 