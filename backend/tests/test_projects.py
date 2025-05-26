#!/usr/bin/env python3
"""
Project Management API Test Suite
Tests project creation, assignment, and access control endpoints
"""

import sys
import os
from base_test import BaseAPITest

# Add the parent directory to the path so we can import from app.config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.config import APIRoutes
except ImportError:
    # Fallback if import fails
    class APIRoutes:
        PROJECTS_CREATE = "/api/projects"
        PROJECTS_LIST = "/api/projects"
        PROJECTS_DETAIL = "/api/projects/{project_id}"
        PROJECTS_ASSIGN_MANAGER = "/api/projects/{project_id}/assign_manager"
        PROJECTS_MANAGERS = "/api/projects/{project_id}/managers"
        USERS_ASSIGNED_PROJECTS = "/api/users/me/assigned_projects"
        SYNTHETIC_STATE = "/_synthetic/state"


class ProjectManagementTest(BaseAPITest):
    """Test suite for project management endpoints"""
    
    def run_tests(self):
        """Run all project management tests"""
        print("📋 TESTING PROJECT MANAGEMENT")
        print("-" * 30)
        
        # Setup session and users
        if not self.setup_session():
            print("❌ Failed to setup session")
            return
        
        self.setup_test_users()
        self._setup_team()
        
        self.test_create_project()
        self.test_list_projects()
        self.test_get_project_details()
        self.test_assign_manager_to_project()
        self.test_list_project_managers()
        self.test_get_assigned_projects()
        self.test_create_project_member_forbidden()
        
        self.print_test_summary()
    
    def _setup_team(self):
        """Setup a team for project testing"""
        # Get existing team from state
        response = self.make_request("GET", APIRoutes.SYNTHETIC_STATE)
        if response and response.status_code == 200:
            state = response.json()
            teams = state.get("teams", [])
            if teams:
                self.test_data["team"] = teams[0]
                print(f"    Using team: {teams[0]['name']}")
    
    def test_create_project(self):
        """Test creating a new project"""
        admin_headers = self.get_admin_headers()
        
        if "team" in self.test_data:
            team_id = self.test_data["team"]["id"]
            
            project_data = {
                "name": "Test Project Creation",
                "description": "A project created for testing purposes",
                "team_id": team_id
            }
            response = self.make_request("POST", APIRoutes.PROJECTS_CREATE, data=project_data, headers=admin_headers)
            if response and response.status_code == 200:
                self.test_data["project"] = response.json()
                self.log_test("POST /api/projects", True, f"Created project: {project_data['name']}")
            else:
                self.log_test("POST /api/projects", False, "Failed to create project", response)
        else:
            self.log_test("POST /api/projects", False, "No team available for project creation")
    
    def test_list_projects(self):
        """Test listing projects for user"""
        admin_headers = self.get_admin_headers()
        
        response = self.make_request("GET", APIRoutes.PROJECTS_LIST, headers=admin_headers)
        if response and response.status_code == 200:
            projects = response.json()
            self.log_test("GET /api/projects", True, f"Retrieved {len(projects)} projects")
        else:
            self.log_test("GET /api/projects", False, "Failed to get projects", response)
    
    def test_get_project_details(self):
        """Test getting project details"""
        admin_headers = self.get_admin_headers()
        
        if "project" in self.test_data:
            project_id = self.test_data["project"]["id"]
            response = self.make_request("GET", APIRoutes.PROJECTS_DETAIL.format(project_id=project_id), headers=admin_headers)
            if response and response.status_code == 200:
                project_details = response.json()
                self.log_test("GET /api/projects/{id}", True, f"Got project: {project_details.get('name')}")
            else:
                self.log_test("GET /api/projects/{id}", False, "Failed to get project details", response)
        else:
            self.log_test("GET /api/projects/{id}", False, "No project available for test")
    
    def test_assign_manager_to_project(self):
        """Test assigning a manager to a project"""
        admin_headers = self.get_admin_headers()
        
        if "project" in self.test_data and "manager" in self.test_users:
            project_id = self.test_data["project"]["id"]
            assignment_data = {
                "project_id": project_id,
                "manager_id": self.test_users["manager"]["id"]
            }
            response = self.make_request("POST", APIRoutes.PROJECTS_ASSIGN_MANAGER.format(project_id=project_id),
                                       data=assignment_data, headers=admin_headers)
            if response and response.status_code == 200:
                self.log_test("POST /api/projects/{id}/assign_manager", True, "Manager assigned successfully")
            else:
                self.log_test("POST /api/projects/{id}/assign_manager", False, "Failed to assign manager", response)
        else:
            self.log_test("POST /api/projects/{id}/assign_manager", False, "No project or manager available")
    
    def test_list_project_managers(self):
        """Test listing project managers"""
        admin_headers = self.get_admin_headers()
        
        if "project" in self.test_data:
            project_id = self.test_data["project"]["id"]
            response = self.make_request("GET", APIRoutes.PROJECTS_MANAGERS.format(project_id=project_id), headers=admin_headers)
            if response and response.status_code == 200:
                managers = response.json()
                self.log_test("GET /api/projects/{id}/managers", True, f"Retrieved {len(managers)} managers")
            else:
                self.log_test("GET /api/projects/{id}/managers", False, "Failed to get project managers", response)
        else:
            self.log_test("GET /api/projects/{id}/managers", False, "No project available for test")
    
    def test_get_assigned_projects(self):
        """Test getting manager's assigned projects"""
        manager_headers = self.get_manager_headers()
        
        response = self.make_request("GET", APIRoutes.USERS_ASSIGNED_PROJECTS, headers=manager_headers)
        if response and response.status_code == 200:
            projects = response.json()
            self.log_test("GET /api/users/me/assigned_projects", True, f"Retrieved {len(projects)} assigned projects")
        else:
            self.log_test("GET /api/users/me/assigned_projects", False, "Failed to get assigned projects", response)
    
    def test_create_project_member_forbidden(self):
        """Test that members cannot create projects"""
        member_headers = self.get_member_headers()
        
        project_data = {
            "name": "Forbidden Project",
            "description": "This should not be created",
            "team_id": "any_team_id"
        }
        response = self.make_request("POST", APIRoutes.PROJECTS_CREATE, data=project_data, headers=member_headers)
        # Should fail with 403
        success = response is not None and response.status_code == 403
        self.log_test("POST /api/projects (member forbidden)", success, "Correctly denied member project creation", response)


def main():
    """Run project management tests"""
    test_suite = ProjectManagementTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 