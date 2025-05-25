#!/usr/bin/env python3
"""
Project Management API Test Suite
Tests project creation, assignment, and management endpoints
"""

from base_test import BaseAPITest


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
        
        self.test_create_project()
        self.test_list_user_projects()
        self.test_get_project_details()
        self.test_assign_manager_to_project()
        self.test_list_project_managers()
        self.test_get_manager_assigned_projects()
        self.test_create_project_member_forbidden()
        
        self.print_test_summary()
    
    def test_create_project(self):
        """Test creating a new project"""
        admin_headers = self.get_admin_headers()
        
        # Get existing team for project creation
        response = self.make_request("GET", "/_synthetic/state")
        if response and response.status_code == 200:
            state = response.json()
            teams = state.get("teams", [])
            if teams:
                team_id = teams[0]["id"]
                
                project_data = {
                    "name": "Test Project",
                    "description": "A project created for testing",
                    "team_id": team_id
                }
                response = self.make_request("POST", "/api/projects", data=project_data, headers=admin_headers)
                if response and response.status_code == 200:
                    self.test_data["project"] = response.json()
                    self.log_test("POST /api/projects", True, f"Created project: {project_data['name']}")
                else:
                    self.log_test("POST /api/projects", False, "Failed to create project", response)
            else:
                self.log_test("POST /api/projects", False, "No teams available for project creation")
        else:
            self.log_test("POST /api/projects", False, "Failed to get state for team info")
    
    def test_list_user_projects(self):
        """Test listing user's accessible projects"""
        admin_headers = self.get_admin_headers()
        response = self.make_request("GET", "/api/projects", headers=admin_headers)
        if response and response.status_code == 200:
            projects = response.json()
            self.test_data["api_projects"] = projects
            self.log_test("GET /api/projects", True, f"Retrieved {len(projects)} projects")
        else:
            self.log_test("GET /api/projects", False, "Failed to get projects", response)
    
    def test_get_project_details(self):
        """Test getting project details"""
        admin_headers = self.get_admin_headers()
        
        if "project" in self.test_data:
            project_id = self.test_data["project"]["id"]
            response = self.make_request("GET", f"/api/projects/{project_id}", headers=admin_headers)
            if response and response.status_code == 200:
                project_details = response.json()
                self.log_test("GET /api/projects/{id}", True, f"Got details for: {project_details.get('name')}")
            else:
                self.log_test("GET /api/projects/{id}", False, "Failed to get project details", response)
        else:
            self.log_test("GET /api/projects/{id}", False, "No project available for test")
    
    def test_assign_manager_to_project(self):
        """Test assigning a manager to a project"""
        admin_headers = self.get_admin_headers()
        
        # Use API-accessible project if available
        project_id = None
        if "api_projects" in self.test_data and self.test_data["api_projects"]:
            project_id = self.test_data["api_projects"][0]["id"]
        elif "project" in self.test_data:
            project_id = self.test_data["project"]["id"]
        
        if project_id and "manager" in self.test_users:
            assignment_data = {
                "manager_id": self.test_users["manager"]["id"]
            }
            response = self.make_request("POST", f"/api/projects/{project_id}/assign_manager", 
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
        
        project_id = None
        if "api_projects" in self.test_data and self.test_data["api_projects"]:
            project_id = self.test_data["api_projects"][0]["id"]
        elif "project" in self.test_data:
            project_id = self.test_data["project"]["id"]
        
        if project_id:
            response = self.make_request("GET", f"/api/projects/{project_id}/managers", headers=admin_headers)
            if response and response.status_code == 200:
                managers = response.json()
                self.log_test("GET /api/projects/{id}/managers", True, f"Retrieved {len(managers)} managers")
            else:
                self.log_test("GET /api/projects/{id}/managers", False, "Failed to get project managers", response)
        else:
            self.log_test("GET /api/projects/{id}/managers", False, "No project available for test")
    
    def test_get_manager_assigned_projects(self):
        """Test getting manager's assigned projects"""
        manager_headers = self.get_manager_headers()
        response = self.make_request("GET", "/api/users/me/assigned_projects", headers=manager_headers)
        if response and response.status_code == 200:
            assigned_projects = response.json()
            self.log_test("GET /api/users/me/assigned_projects", True, f"Retrieved {len(assigned_projects)} assigned projects")
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
        response = self.make_request("POST", "/api/projects", data=project_data, headers=member_headers)
        # Should fail with 403
        success = response is not None and response.status_code == 403
        self.log_test("POST /api/projects (member forbidden)", success, "Correctly denied member project creation", response)


def main():
    """Run project management tests"""
    test_suite = ProjectManagementTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 