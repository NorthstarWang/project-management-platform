from typing import Dict, Any, List, Optional
from .base_repository import BaseRepository

class ProjectRepository(BaseRepository):
    """Repository for project and team data access"""
    
    def __init__(self, projects_store: List[Dict[str, Any]], teams_store: List[Dict[str, Any]], 
                 team_memberships_store: List[Dict[str, Any]], project_assignments_store: List[Dict[str, Any]]):
        super().__init__(projects_store)
        self.teams_store = teams_store
        self.team_memberships_store = team_memberships_store
        self.project_assignments_store = project_assignments_store
    
    def find_projects_by_team(self, team_id: str) -> List[Dict[str, Any]]:
        """Find projects belonging to a team"""
        return self.find_by_field("team_id", team_id)
    
    def find_user_teams(self, user_id: str) -> List[Dict[str, Any]]:
        """Find teams a user belongs to"""
        user_team_ids = [tm["team_id"] for tm in self.team_memberships_store if tm["user_id"] == user_id]
        return [team for team in self.teams_store if team["id"] in user_team_ids]
    
    def find_manager_projects(self, manager_id: str) -> List[Dict[str, Any]]:
        """Find projects assigned to a manager"""
        assigned_project_ids = [pa["project_id"] for pa in self.project_assignments_store 
                               if pa["manager_id"] == manager_id]
        return [project for project in self.data_store if project["id"] in assigned_project_ids]
    
    def find_project_managers(self, project_id: str) -> List[str]:
        """Find manager IDs assigned to a project"""
        return [pa["manager_id"] for pa in self.project_assignments_store 
                if pa["project_id"] == project_id]
    
    def is_manager_assigned_to_project(self, manager_id: str, project_id: str) -> bool:
        """Check if a manager is assigned to a project"""
        return any(pa["manager_id"] == manager_id and pa["project_id"] == project_id 
                  for pa in self.project_assignments_store)
    
    def create_team(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new team"""
        team = {
            "id": str(__import__('uuid').uuid4()),
            "created_at": __import__('time').time(),
            **data
        }
        self.teams_store.append(team)
        return team
    
    def add_user_to_team(self, user_id: str, team_id: str, role: str = "member") -> Dict[str, Any]:
        """Add user to team"""
        membership = {
            "id": str(__import__('uuid').uuid4()),
            "user_id": user_id,
            "team_id": team_id,
            "role": role,
            "joined_at": __import__('time').time()
        }
        self.team_memberships_store.append(membership)
        return membership
    
    def assign_project_to_manager(self, project_id: str, manager_id: str, assigned_by: str) -> Dict[str, Any]:
        """Assign a project to a manager"""
        # Check if already assigned
        existing = next((pa for pa in self.project_assignments_store 
                        if pa["project_id"] == project_id and pa["manager_id"] == manager_id), None)
        if existing:
            return existing
        
        assignment = {
            "id": str(__import__('uuid').uuid4()),
            "project_id": project_id,
            "manager_id": manager_id,
            "assigned_by": assigned_by,
            "assigned_at": __import__('time').time()
        }
        self.project_assignments_store.append(assignment)
        return assignment 