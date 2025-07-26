#!/usr/bin/env python3
"""
Board Management API Test Suite
Tests board operations, member enrollment, and access control
"""

from base_test import BaseAPITest
from test_config import APIRoutes


class BoardManagementTest(BaseAPITest):
    """Test suite for board management endpoints"""
    
    def run_tests(self):
        """Run all board management tests"""
        print("📊 TESTING BOARD MANAGEMENT")
        print("-" * 30)
        
        # Run each test in isolation
        self.run_isolated_test(self.test_create_board)
        self.run_isolated_test(self.test_list_project_boards)
        self.run_isolated_test(self.test_get_board_details)
        self.run_isolated_test(self.test_enroll_member_in_board)
        self.run_isolated_test(self.test_remove_member_from_board)
        self.run_isolated_test(self.test_list_board_members)
        self.run_isolated_test(self.test_get_user_boards)
        self.run_isolated_test(self.test_create_board_member_forbidden)
        
        self.print_test_summary()
    
    def test_create_board(self):
        """Test creating a new board"""
        admin_headers = self.get_admin_headers()
        
        # Create a project first
        project = self.create_test_project("Board Test Project", admin_headers)
        if not project:
            self.log_test("POST /api/boards", False, "Failed to create test project")
            return
        
        board_data = {
            "name": "Test Board Creation",
            "description": "A board created for testing purposes",
            "project_id": project["id"]
        }
        
        response = self.make_request("POST", APIRoutes.BOARDS_CREATE, data=board_data, headers=admin_headers)
        if response and response.status_code == 200:
            board = response.json()
            self.test_data["board"] = board
            self.log_test("POST /api/boards", True, f"Created board: {board['name']}")
        else:
            self.log_test("POST /api/boards", False, "Failed to create board", response)
    
    def test_list_project_boards(self):
        """Test listing boards for a project"""
        admin_headers = self.get_admin_headers()
        
        # Create a project and board
        project = self.create_test_project("Board List Test Project", admin_headers)
        if not project:
            self.log_test("GET /api/projects/{id}/boards", False, "Failed to create test project")
            return
        
        board = self.create_test_board(project["id"], "Board List Test Board", admin_headers)
        if not board:
            self.log_test("GET /api/projects/{id}/boards", False, "Failed to create test board")
            return
        
        response = self.make_request("GET", APIRoutes.PROJECTS_BOARDS.format(project_id=project["id"]), headers=admin_headers)
        if response and response.status_code == 200:
            boards = response.json()
            success = isinstance(boards, list) and len(boards) > 0
            self.log_test("GET /api/projects/{id}/boards", success, f"Project has {len(boards)} boards")
        else:
            self.log_test("GET /api/projects/{id}/boards", False, "Failed to list project boards", response)
    
    def test_get_board_details(self):
        """Test getting board details with lists and tasks"""
        admin_headers = self.get_admin_headers()
        
        # Create project, board, and list
        project = self.create_test_project("Board Details Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Board Details Test Board", admin_headers)
        test_list = self.create_test_list(board["id"], "Board Details Test List", admin_headers)
        
        if not test_list:
            self.log_test("GET /api/boards/{id}", False, "Failed to create test setup")
            return
        
        response = self.make_request("GET", APIRoutes.BOARDS_DETAIL.format(board_id=board["id"]), headers=admin_headers)
        if response and response.status_code == 200:
            board_details = response.json()
            has_lists = "lists" in board_details
            success = board_details["id"] == board["id"] and has_lists
            self.log_test("GET /api/boards/{id}", success, f"Got board with lists: {has_lists}")
        else:
            self.log_test("GET /api/boards/{id}", False, "Failed to get board details", response)
    
    def test_enroll_member_in_board(self):
        """Test enrolling a member in a board"""
        admin_headers = self.get_admin_headers()
        
        # Create project and board
        project = self.create_test_project("Member Enrollment Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Member Enrollment Test Board", admin_headers)
        
        if not board:
            self.log_test("POST /api/boards/{id}/enroll_member", False, "Failed to create test setup")
            return
        
        # Get a member user
        self.get_member_headers()  # This populates self.test_users["member"]
        if "member" not in self.test_users:
            self.log_test("POST /api/boards/{id}/enroll_member", False, "No member user available")
            return
        
        enrollment_data = {
            "board_id": board["id"],
            "user_id": self.test_users["member"]["id"]
        }
        
        response = self.make_request("POST", APIRoutes.BOARDS_ENROLL_MEMBER.format(board_id=board["id"]), 
                                   data=enrollment_data, headers=admin_headers)
        if response and response.status_code == 200:
            self.log_test("POST /api/boards/{id}/enroll_member", True, "Member enrolled successfully")
        else:
            self.log_test("POST /api/boards/{id}/enroll_member", False, "Failed to enroll member", response)
    
    def test_remove_member_from_board(self):
        """Test removing a member from a board"""
        admin_headers = self.get_admin_headers()
        
        # Create project and board
        project = self.create_test_project("Member Removal Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Member Removal Test Board", admin_headers)
        
        if not board:
            self.log_test("DELETE /api/boards/{id}/members/{user_id}", False, "Failed to create test setup")
            return
        
        # Get member headers (this will populate self.test_users["member"])
        self.get_member_headers()
        if "member" not in self.test_users:
            self.log_test("DELETE /api/boards/{id}/members/{user_id}", False, "No member user available")
            return
        
        # Enroll member first
        enrollment_data = {
            "board_id": board["id"],
            "user_id": self.test_users["member"]["id"]
        }
        enroll_response = self.make_request("POST", APIRoutes.BOARDS_ENROLL_MEMBER.format(board_id=board["id"]), 
                                          data=enrollment_data, headers=admin_headers)
        
        if not enroll_response or enroll_response.status_code != 200:
            self.log_test("DELETE /api/boards/{id}/members/{user_id}", False, "Failed to enroll member first")
            return
        
        # Now remove the member
        response = self.make_request("DELETE", APIRoutes.BOARDS_REMOVE_MEMBER.format(
            board_id=board["id"], user_id=self.test_users["member"]["id"]), headers=admin_headers)
        
        if response and response.status_code == 200:
            self.log_test("DELETE /api/boards/{id}/members/{user_id}", True, "Member removed successfully")
        else:
            self.log_test("DELETE /api/boards/{id}/members/{user_id}", False, "Failed to remove member", response)
    
    def test_list_board_members(self):
        """Test listing members of a board"""
        admin_headers = self.get_admin_headers()
        
        # Create project and board
        project = self.create_test_project("Board Members Test Project", admin_headers)
        board = self.create_test_board(project["id"], "Board Members Test Board", admin_headers)
        
        if not board:
            self.log_test("GET /api/boards/{id}/members", False, "Failed to create test setup")
            return
        
        # Enroll a member
        if "member" in self.test_users:
            enrollment_data = {
                "board_id": board["id"],
                "user_id": self.test_users["member"]["id"]
            }
            self.make_request("POST", APIRoutes.BOARDS_ENROLL_MEMBER.format(board_id=board["id"]), 
                            data=enrollment_data, headers=admin_headers)
        
        response = self.make_request("GET", APIRoutes.BOARDS_MEMBERS.format(board_id=board["id"]), headers=admin_headers)
        if response and response.status_code == 200:
            members = response.json()
            success = isinstance(members, list)
            self.log_test("GET /api/boards/{id}/members", success, f"Board has {len(members)} members")
        else:
            self.log_test("GET /api/boards/{id}/members", False, "Failed to list board members", response)
    
    def test_get_user_boards(self):
        """Test getting boards that a user is enrolled in"""
        admin_headers = self.get_admin_headers()
        member_headers = self.get_member_headers()
        
        if "member" not in self.test_users:
            self.log_test("GET /api/users/me/boards", False, "No member user available")
            return
        
        # Create project and board, then enroll member
        project = self.create_test_project("User Boards Test Project", admin_headers)
        board = self.create_test_board(project["id"], "User Boards Test Board", admin_headers)
        
        if board:
            enrollment_data = {
                "board_id": board["id"],
                "user_id": self.test_users["member"]["id"]
            }
            self.make_request("POST", APIRoutes.BOARDS_ENROLL_MEMBER.format(board_id=board["id"]), 
                            data=enrollment_data, headers=admin_headers)
        
        response = self.make_request("GET", APIRoutes.USERS_BOARDS, headers=member_headers)
        if response and response.status_code == 200:
            boards = response.json()
            success = isinstance(boards, list)
            self.log_test("GET /api/users/me/boards", success, f"User is enrolled in {len(boards)} boards")
        else:
            self.log_test("GET /api/users/me/boards", False, "Failed to get user boards", response)
    
    def test_create_board_member_forbidden(self):
        """Test that members cannot create boards"""
        member_headers = self.get_member_headers()
        admin_headers = self.get_admin_headers()
        
        # Create a project as admin
        project = self.create_test_project("Forbidden Board Test Project", admin_headers)
        if not project:
            self.log_test("POST /api/boards (member forbidden)", False, "Failed to create test project")
            return
        
        board_data = {
            "name": "Forbidden Board",
            "description": "This board should not be created",
            "project_id": project["id"]
        }
        
        response = self.make_request("POST", APIRoutes.BOARDS_CREATE, data=board_data, headers=member_headers)
        # Should fail with 403 (forbidden)
        success = response is not None and response.status_code == 403
        self.log_test("POST /api/boards (member forbidden)", success, "Correctly denied member board creation", response)


def main():
    """Run board management tests"""
    test_suite = BoardManagementTest()
    test_suite.run_tests()


if __name__ == "__main__":
    main() 