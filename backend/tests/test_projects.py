#!/usr/bin/env python3
"""
Project Management API Test Suite
Tests project CRUD operations, manager assignments, and project access control
"""

from base_test import BaseAPITest
from test_config import APIRoutes


class ProjectManagementTest(BaseAPITest):
    """Test suite for project management endpoints"""
    
    def run_tests(self):
        """Run all project management tests"""
        print("📋 TESTING PROJECT MANAGEMENT")
        print("-" * 30)
        
        # Run each test in isolation
        self.run_isolated_test(self.test_create_project)
        self.run_isolated_test(self.test_list_projects)
        self.run_isolated_test(self.test_get_project_details)
        self.run_isolated_test(self.test_assign_manager_to_project)
        self.run_isolated_test(self.test_list_project_managers)
        self.run_isolated_test(self.test_get_manager_assigned_projects)
        self.run_isolated_test(self.test_create_project_member_forbidden)
        
        self.print_test_summary()
    
    def test_create_project(self):
        """Test creating a new project"""
        admin_headers = self.get_admin_headers()
        
        # Use the helper method that properly gets a valid team ID
        project = self.create_test_project("Test Project Creation", admin_headers)
        if project:
            self.test_data["project"] = project
            self.log_test("POST /api/projects", True, f"Created project: {project['name']}")
        else:
            self.log_test("POST /api/projects", False, "Failed to create project")
    
    def test_list_projects(self):
        """Test listing user's projects"""
        admin_headers = self.get_admin_headers()
        
        response = self.make_request("GET", APIRoutes.PROJECTS_LIST, headers=admin_headers)
        if response and response.status_code == 200:
            projects = response.json()
            success = isinstance(projects, list)
            self.log_test("GET /api/projects", success, f"Retrieved {len(projects)} projects")
        else:
            self.log_test("GET /api/projects", False, "Failed to list projects", response)
    
    def test_get_project_details(self):
        """Test getting project details"""
        admin_headers = self.get_admin_headers()
        
        # Create a project first
        project = self.create_test_project("Project Details Test", admin_headers)
        if not project:
            self.log_test("GET /api/projects/{id}", False, "Failed to create test project")
            return
        
        response = self.make_request("GET", APIRoutes.PROJECTS_DETAIL.format(project_id=project["id"]), headers=admin_headers)
        if response and response.status_code == 200:
            project_details = response.json()
            success = project_details["id"] == project["id"]
            self.log_test("GET /api/projects/{id}", success, f"Got project: {project_details['name']}")
        else:
            self.log_test("GET /api/projects/{id}", False, "Failed to get project details", response)
    
    def test_assign_manager_to_project(self):
        """Test assigning a manager to a project"""
        admin_headers = self.get_admin_headers()
        
        # Create a project first
        project = self.create_test_project("Manager Assignment Test", admin_headers)
        if not project:
            self.log_test("POST /api/projects/{id}/assign_manager", False, "Failed to create test project")
            return
        
        # Get a manager user ID
        self.get_manager_headers()
        if "manager" not in self.test_users:
            self.log_test("POST /api/projects/{id}/assign_manager", False, "No manager user available")
            return
        
        assignment_data = {
            "project_id": project["id"],
            "manager_id": self.test_users["manager"]["id"]
        }
        
        response = self.make_request("POST", APIRoutes.PROJECTS_ASSIGN_MANAGER.format(project_id=project["id"]), 
                                   data=assignment_data, headers=admin_headers)
        if response and response.status_code == 200:
            self.log_test("POST /api/projects/{id}/assign_manager", True, "Manager assigned successfully")
        else:
            self.log_test("POST /api/projects/{id}/assign_manager", False, "Failed to assign manager", response)
    
    def test_list_project_managers(self):
        """Test listing managers assigned to a project"""
        admin_headers = self.get_admin_headers()
        
        # Create a project and assign a manager
        project = self.create_test_project("Manager List Test", admin_headers)
        if not project:
            self.log_test("GET /api/projects/{id}/managers", False, "Failed to create test project")
            return
        
        # Assign a manager first
        if "manager" in self.test_users:
            assignment_data = {
                "project_id": project["id"],
                "manager_id": self.test_users["manager"]["id"]
            }
            self.make_request("POST", APIRoutes.PROJECTS_ASSIGN_MANAGER.format(project_id=project["id"]), 
                            data=assignment_data, headers=admin_headers)
        
        response = self.make_request("GET", APIRoutes.PROJECTS_MANAGERS.format(project_id=project["id"]), headers=admin_headers)
        if response and response.status_code == 200:
            managers = response.json()
            success = isinstance(managers, list)
            self.log_test("GET /api/projects/{id}/managers", success, f"Project has {len(managers)} managers")
        else:
            self.log_test("GET /api/projects/{id}/managers", False, "Failed to get project managers", response)
    
    def test_get_manager_assigned_projects(self):
        """Test getting projects assigned to a manager"""
        admin_headers = self.get_admin_headers()
        manager_headers = self.get_manager_headers()
        
        if "manager" not in self.test_users:
            self.log_test("GET /api/users/me/assigned_projects", False, "No manager user available")
            return
        
        # Create a project and assign the manager
        project = self.create_test_project("Manager Projects Test", admin_headers)
        if project:
            assignment_data = {
                "project_id": project["id"],
                "manager_id": self.test_users["manager"]["id"]
            }
            self.make_request("POST", APIRoutes.PROJECTS_ASSIGN_MANAGER.format(project_id=project["id"]), 
                            data=assignment_data, headers=admin_headers)
        
        response = self.make_request("GET", APIRoutes.USERS_ASSIGNED_PROJECTS, headers=manager_headers)
        if response and response.status_code == 200:
            projects = response.json()
            success = isinstance(projects, list)
            self.log_test("GET /api/users/me/assigned_projects", success, f"Manager has {len(projects)} assigned projects")
        else:
            self.log_test("GET /api/users/me/assigned_projects", False, "Failed to get manager assigned projects", response)
    
    def test_create_project_member_forbidden(self):
        """Test that members cannot create projects"""
        member_headers = self.get_member_headers()
        
        # Get a valid team ID for the test
        state_response = self.make_request("GET", APIRoutes.SYNTHETIC_STATE)
        if not state_response or state_response.status_code != 200:
            self.log_test("POST /api/projects (member forbidden)", False, "Failed to get backend state")
            return
        
        state = state_response.json()
        teams = state.get('teams', [])
        if not teams:
            self.log_test("POST /api/projects (member forbidden)", False, "No teams available")
            return
        
        project_data = {
            "name": "Forbidden Project",
            "description": "This project should not be created",
            "team_id": teams[0]['id']
        }
        
        response = self.make_request("POST", APIRoutes.PROJECTS_CREATE, data=project_data, headers=member_headers)
        # Should fail with 403 (forbidden)
        success = response is not None and response.status_code == 403
        self.log_test("POST /api/projects (member forbidden)", success, "Correctly denied member project creation", response)


def main():
    """Run project management tests"""
    test_suite = ProjectManagementTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 