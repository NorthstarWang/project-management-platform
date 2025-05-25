#!/usr/bin/env python3
"""
Board Management API Test Suite
Tests board creation, member enrollment, and board access endpoints
"""

from base_test import BaseAPITest


class BoardManagementTest(BaseAPITest):
    """Test suite for board management endpoints"""
    
    def run_tests(self):
        """Run all board management tests"""
        print("📊 TESTING BOARD MANAGEMENT")
        print("-" * 30)
        
        # Setup session and users
        if not self.setup_session():
            print("❌ Failed to setup session")
            return
        
        self.setup_test_users()
        self._setup_project()
        
        self.test_create_board()
        self.test_list_project_boards()
        self.test_get_board_details()
        self.test_enroll_member_in_board()
        self.test_list_board_members()
        self.test_remove_board_member()
        self.test_get_user_boards()
        self.test_create_board_member_forbidden()
        
        self.print_test_summary()
    
    def _setup_project(self):
        """Setup a project for board testing"""
        admin_headers = self.get_admin_headers()
        
        # Get existing team for project creation
        response = self.make_request("GET", "/_synthetic/state")
        if response and response.status_code == 200:
            state = response.json()
            teams = state.get("teams", [])
            if teams:
                team_id = teams[0]["id"]
                
                project_data = {
                    "name": "Board Test Project",
                    "description": "A project for testing boards",
                    "team_id": team_id
                }
                response = self.make_request("POST", "/api/projects", data=project_data, headers=admin_headers)
                if response and response.status_code == 200:
                    self.test_data["project"] = response.json()
    
    def test_create_board(self):
        """Test creating a new board"""
        admin_headers = self.get_admin_headers()
        
        if "project" in self.test_data:
            project_id = self.test_data["project"]["id"]
            
            board_data = {
                "name": "Test Board",
                "description": "A board created for testing",
                "project_id": project_id
            }
            response = self.make_request("POST", "/api/boards", data=board_data, headers=admin_headers)
            if response and response.status_code == 200:
                self.test_data["board"] = response.json()
                self.log_test("POST /api/boards", True, f"Created board: {board_data['name']}")
            else:
                self.log_test("POST /api/boards", False, "Failed to create board", response)
        else:
            self.log_test("POST /api/boards", False, "No project available for board creation")
    
    def test_list_project_boards(self):
        """Test listing boards for a project"""
        admin_headers = self.get_admin_headers()
        
        if "project" in self.test_data:
            project_id = self.test_data["project"]["id"]
            response = self.make_request("GET", f"/api/projects/{project_id}/boards", headers=admin_headers)
            if response and response.status_code == 200:
                boards = response.json()
                self.log_test("GET /api/projects/{id}/boards", True, f"Retrieved {len(boards)} boards")
            else:
                self.log_test("GET /api/projects/{id}/boards", False, "Failed to get project boards", response)
        else:
            self.log_test("GET /api/projects/{id}/boards", False, "No project available for test")
    
    def test_get_board_details(self):
        """Test getting board details with lists and tasks"""
        admin_headers = self.get_admin_headers()
        
        if "board" in self.test_data:
            board_id = self.test_data["board"]["id"]
            response = self.make_request("GET", f"/api/boards/{board_id}", headers=admin_headers)
            if response and response.status_code == 200:
                board_details = response.json()
                lists = board_details.get("lists", [])
                self.log_test("GET /api/boards/{id}", True, f"Got board with {len(lists)} lists")
            else:
                self.log_test("GET /api/boards/{id}", False, "Failed to get board details", response)
        else:
            self.log_test("GET /api/boards/{id}", False, "No board available for test")
    
    def test_enroll_member_in_board(self):
        """Test enrolling a member in a board"""
        admin_headers = self.get_admin_headers()
        
        if "board" in self.test_data and "member" in self.test_users:
            board_id = self.test_data["board"]["id"]
            membership_data = {
                "user_id": self.test_users["member"]["id"]
            }
            response = self.make_request("POST", f"/api/boards/{board_id}/enroll_member", 
                                       data=membership_data, headers=admin_headers)
            if response and response.status_code == 200:
                self.log_test("POST /api/boards/{id}/enroll_member", True, "Member enrolled successfully")
            else:
                self.log_test("POST /api/boards/{id}/enroll_member", False, "Failed to enroll member", response)
        else:
            self.log_test("POST /api/boards/{id}/enroll_member", False, "No board or member available")
    
    def test_list_board_members(self):
        """Test listing board members"""
        admin_headers = self.get_admin_headers()
        
        if "board" in self.test_data:
            board_id = self.test_data["board"]["id"]
            response = self.make_request("GET", f"/api/boards/{board_id}/members", headers=admin_headers)
            if response and response.status_code == 200:
                members = response.json()
                self.log_test("GET /api/boards/{id}/members", True, f"Retrieved {len(members)} board members")
            else:
                self.log_test("GET /api/boards/{id}/members", False, "Failed to get board members", response)
        else:
            self.log_test("GET /api/boards/{id}/members", False, "No board available for test")
    
    def test_remove_board_member(self):
        """Test removing a member from a board"""
        admin_headers = self.get_admin_headers()
        
        if "board" in self.test_data and "member" in self.test_users:
            board_id = self.test_data["board"]["id"]
            user_id = self.test_users["member"]["id"]
            response = self.make_request("DELETE", f"/api/boards/{board_id}/members/{user_id}", headers=admin_headers)
            if response and response.status_code == 200:
                self.log_test("DELETE /api/boards/{id}/members/{user_id}", True, "Member removed successfully")
            else:
                self.log_test("DELETE /api/boards/{id}/members/{user_id}", False, "Failed to remove member", response)
        else:
            self.log_test("DELETE /api/boards/{id}/members/{user_id}", False, "No board or member available")
    
    def test_get_user_boards(self):
        """Test getting user's enrolled boards"""
        admin_headers = self.get_admin_headers()
        response = self.make_request("GET", "/api/users/me/boards", headers=admin_headers)
        if response and response.status_code == 200:
            boards = response.json()
            self.log_test("GET /api/users/me/boards", True, f"Retrieved {len(boards)} user boards")
        else:
            self.log_test("GET /api/users/me/boards", False, "Failed to get user boards", response)
    
    def test_create_board_member_forbidden(self):
        """Test that members cannot create boards"""
        member_headers = self.get_member_headers()
        
        board_data = {
            "name": "Forbidden Board",
            "description": "This should not be created",
            "project_id": "any_project_id"
        }
        response = self.make_request("POST", "/api/boards", data=board_data, headers=member_headers)
        # Should fail with 403
        success = response is not None and response.status_code == 403
        self.log_test("POST /api/boards (member forbidden)", success, "Correctly denied member board creation", response)


def main():
    """Run board management tests"""
    test_suite = BoardManagementTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 